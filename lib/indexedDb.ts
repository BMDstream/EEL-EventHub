const DB_NAME = "EEL_EventHub_Offline";
const DB_VERSION = 2;

export interface OfflineScan {
  id?: number;
  event_id?: number;
  registration_id: string;
  day: number | null;
  timestamp: string;
  mode: "checkin" | "checkout" | "toggle";
  synced: boolean;
}

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in browser environments"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      
      // Store event info
      if (!db.objectStoreNames.contains("events")) {
        db.createObjectStore("events", { keyPath: "id" });
      }

      // Store registrations list
      let regStore: IDBObjectStore;
      if (!db.objectStoreNames.contains("registrations")) {
        regStore = db.createObjectStore("registrations", { keyPath: "id" });
      } else {
        regStore = event.target.transaction.objectStore("registrations");
      }
      if (!regStore.indexNames.contains("pin")) {
        regStore.createIndex("pin", "pin", { unique: false });
      }
      if (!regStore.indexNames.contains("event_id")) {
        regStore.createIndex("event_id", "event_id", { unique: false });
      }

      // Store pending scan queues
      let scanStore: IDBObjectStore;
      if (!db.objectStoreNames.contains("offline_scans")) {
        scanStore = db.createObjectStore("offline_scans", { keyPath: "id", autoIncrement: true });
      } else {
        scanStore = event.target.transaction.objectStore("offline_scans");
      }
      if (!scanStore.indexNames.contains("event_id")) {
        scanStore.createIndex("event_id", "event_id", { unique: false });
      }
    };
  });
}

export async function saveOfflineEvent(event: any, registrations: any[]): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["events", "registrations"], "readwrite");
    
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const eventStore = tx.objectStore("events");
    const regStore = tx.objectStore("registrations");

    // Save event details
    eventStore.put({
      id: event.id,
      title: event.title,
      start_date: event.start_date,
      duration_days: event.duration_days,
      logo_url: event.logo_url,
      custom_fields_schema: event.custom_fields_schema
    });

    const targetEventId = Number(event.id);

    // Clear previous registrations for this specific event to eliminate stale/deleted data
    const getAllReq = regStore.getAll();
    getAllReq.onsuccess = () => {
      const existing = getAllReq.result || [];
      existing.forEach((item: any) => {
        if (item.event_id !== undefined && Number(item.event_id) === targetEventId) {
          regStore.delete(item.id);
        }
      });

      // Write fresh registrations, strictly ensuring event_id is always assigned
      registrations.forEach(reg => {
        regStore.put({
          id: String(reg.id),
          event_id: Number(reg.event_id ?? event.id),
          pin: reg.pin,
          status: reg.status,
          checked_in: Boolean(reg.checked_in),
          checked_in_days: reg.checked_in_days || [],
          attendee: reg.attendee
        });
      });
    };
  });
}

export async function getLocalRegistration(idOrPin: string, eventId?: number): Promise<any | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["registrations"], "readonly");
    const store = tx.objectStore("registrations");

    tx.onerror = () => reject(tx.error);

    // Try looking up by UUID key directly
    const getReq = store.get(idOrPin);
    getReq.onsuccess = () => {
      if (getReq.result) {
        const reg = getReq.result;
        if (eventId !== undefined && reg.event_id !== undefined && Number(reg.event_id) !== Number(eventId)) {
          resolve(null);
        } else {
          resolve(reg);
        }
      } else {
        // Fall back to looking up by PIN index
        const pinIndex = store.index("pin");
        const pinReq = pinIndex.getAll(idOrPin);
        pinReq.onsuccess = () => {
          const results: any[] = pinReq.result || [];
          if (eventId !== undefined) {
            const match = results.find((r: any) => {
              if (r.event_id === undefined || r.event_id === null) return true;
              return Number(r.event_id) === Number(eventId);
            });
            resolve(match || null);
          } else {
            resolve(results[0] || null);
          }
        };
        pinReq.onerror = () => reject(pinReq.error);
      }
    };
  });
}

export async function addOfflineScan(scan: OfflineScan): Promise<number> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["offline_scans", "registrations"], "readwrite");
    const scanStore = tx.objectStore("offline_scans");
    const regStore = tx.objectStore("registrations");

    tx.onerror = () => reject(tx.error);

    // 1. Log the offline scan in the queue
    const addReq = scanStore.add(scan);
    
    addReq.onsuccess = () => {
      const scanId = addReq.result as number;

      // 2. Optimistically update local registrations store so subsequent offline scans reflect this state
      const getReq = regStore.get(scan.registration_id);
      getReq.onsuccess = () => {
        const reg = getReq.result;
        if (reg) {
          const days = reg.checked_in_days || [];
          const targetDay = scan.day || 1;
          
          if (scan.mode === "checkin") {
            if (!days.includes(targetDay)) {
              days.push(targetDay);
            }
          } else if (scan.mode === "checkout") {
            const idx = days.indexOf(targetDay);
            if (idx > -1) days.splice(idx, 1);
          } else {
            // Toggle
            const idx = days.indexOf(targetDay);
            if (idx > -1) days.splice(idx, 1);
            else days.push(targetDay);
          }

          reg.checked_in_days = days;
          reg.checked_in = days.length > 0;
          regStore.put(reg);
        }
        resolve(scanId);
      };
    };
  });
}

export async function getPendingScans(eventId?: number): Promise<OfflineScan[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["offline_scans"], "readonly");
    const store = tx.objectStore("offline_scans");
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let results: OfflineScan[] = request.result || [];
      if (eventId !== undefined) {
        results = results.filter(s => s.event_id === undefined || Number(s.event_id) === Number(eventId));
      }
      resolve(results);
    };
  });
}

export async function markScansSynced(ids: number[]): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["offline_scans"], "readwrite");
    const store = tx.objectStore("offline_scans");

    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    ids.forEach(id => {
      store.delete(id);
    });
  });
}

export async function getOfflineStats(eventId?: number): Promise<{ cachedCount: number; checkedInCount: number }> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["registrations"], "readonly");
    const store = tx.objectStore("registrations");
    const req = store.getAll();

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      let list: any[] = req.result || [];
      if (eventId !== undefined) {
        list = list.filter(r => Number(r.event_id) === Number(eventId));
      }
      const checkedIn = list.filter(r => r.checked_in).length;
      resolve({
        cachedCount: list.length,
        checkedInCount: checkedIn
      });
    };
  });
}

export async function clearOfflineCache(eventId?: number): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["events", "registrations", "offline_scans"], "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    if (eventId !== undefined) {
      const targetId = Number(eventId);
      tx.objectStore("events").delete(targetId);

      const regStore = tx.objectStore("registrations");
      const regReq = regStore.getAll();
      regReq.onsuccess = () => {
        (regReq.result || []).forEach((r: any) => {
          if (Number(r.event_id) === targetId) {
            regStore.delete(r.id);
          }
        });
      };

      const scanStore = tx.objectStore("offline_scans");
      const scanReq = scanStore.getAll();
      scanReq.onsuccess = () => {
        (scanReq.result || []).forEach((s: any) => {
          if (s.event_id !== undefined && Number(s.event_id) === targetId) {
            scanStore.delete(s.id);
          }
        });
      };
    } else {
      tx.objectStore("events").clear();
      tx.objectStore("registrations").clear();
      tx.objectStore("offline_scans").clear();
    }
  });
}
