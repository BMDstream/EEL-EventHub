const DB_NAME = "EEL_EventHub_Offline";
const DB_VERSION = 1;

export interface OfflineScan {
  id?: number;
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
      if (!db.objectStoreNames.contains("registrations")) {
        const regStore = db.createObjectStore("registrations", { keyPath: "id" });
        regStore.createIndex("pin", "pin", { unique: false });
      }

      // Store pending scan queues
      if (!db.objectStoreNames.contains("offline_scans")) {
        db.createObjectStore("offline_scans", { keyPath: "id", autoIncrement: true });
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

    // Clear previous registrations for this event to avoid stale data
    // (We will write all new registrations downloaded)
    registrations.forEach(reg => {
      regStore.put({
        id: reg.id,
        event_id: reg.event_id,
        pin: reg.pin,
        status: reg.status,
        checked_in: reg.checked_in,
        checked_in_days: reg.checked_in_days || [],
        attendee: reg.attendee
      });
    });
  });
}

export async function getLocalRegistration(idOrPin: string): Promise<any | null> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["registrations"], "readonly");
    const store = tx.objectStore("registrations");

    tx.onerror = () => reject(tx.error);

    // Try looking up by UUID key directly
    const getReq = store.get(idOrPin);
    getReq.onsuccess = () => {
      if (getReq.result) {
        resolve(getReq.result);
      } else {
        // Fall back to looking up by PIN index
        const pinIndex = store.index("pin");
        const pinReq = pinIndex.get(idOrPin);
        pinReq.onsuccess = () => {
          resolve(pinReq.result || null);
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

export async function getPendingScans(): Promise<OfflineScan[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["offline_scans"], "readonly");
    const store = tx.objectStore("offline_scans");
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result || []);
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

export async function getOfflineStats(): Promise<{ cachedCount: number; checkedInCount: number }> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["registrations"], "readonly");
    const store = tx.objectStore("registrations");
    const req = store.getAll();

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const list = req.result || [];
      const checkedIn = list.filter(r => r.checked_in).length;
      resolve({
        cachedCount: list.length,
        checkedInCount: checkedIn
      });
    };
  });
}

export async function clearOfflineCache(): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["events", "registrations", "offline_scans"], "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    tx.objectStore("events").clear();
    tx.objectStore("registrations").clear();
    tx.objectStore("offline_scans").clear();
  });
}
