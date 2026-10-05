# BMD-EventHub: User & Operational Guide

Welcome to the BMD Computing Event Hub. This guide will walk you through the core workflows of the platform, from initializing an event to live on-site operations.

---

## 1. Event Command Center
The **Command Center** is your primary dashboard for managing specific events. 

### Creating/Editing Events
- **Initialize**: Use the "Create Event" button in the Admin Panel to set the title, slug (URL), date, and location.
- **Visual Branding**: Upload a high-resolution **Background Banner** (1920x1080 recommended) to give your registration page a premium feel.
- **Client Link**: Use the "Share Client Link" button to get the public registration URL to send to your guests.

---

## 2. Form Studio (Custom Registration)
Every event has unique data requirements. Use the **Form Studio** tab within an event to build your custom questionnaire.

- **Field Types**: Add Text inputs, Select menus (dropdowns), or Checkboxes.
- **Validation**: Mark fields as "Required" to ensure you capture essential intelligence (e.g., Dietary Requirements, VIP Status).
- **Live Sync**: Changes saved in Form Studio are immediately reflected on the public registration page.

---

## 3. Registrant Management
Track your guest manifest in real-time under the **Registrants** tab.

- **Search & Filter**: Quickly find guests by name, email, or organization using the search bar.
- **Export Manifest**: Download the complete guest list as a CSV or Excel file for offline use, badge printing, or reporting.
- **Manual 1–2 Changes**: Click on any attendee row in the manifest table to open the **Registration Details & Edit** drawer. You can instantly adjust First Name, Last Name, Email, Organization, Clearance PIN, Status, and all custom questionnaire answers.
- **Last-Minute Bulk Changes & Sync**:
  - Click **"Bulk Upload & Changes"** to upload an Excel (`.xlsx`, `.xls`) or CSV sheet with multiple attendee changes.
  - **Live Manifest Round-Trip**: Click **"Download Live Manifest"** directly inside the modal to get a spreadsheet pre-populated with current guests and Clearance PINs. Edit the rows in Excel, save, and drop the file back in.
  - **Automatic Matching & Live Diff**: The system matches records by **Clearance PIN** or **Email Address**, showing an instant breakdown:
    - 🔄 **To Update**: Highlights exact before-and-after changes per attendee (names, organizations, dietary requirements, table numbers, status).
    - ➕ **New Additions**: Highlights newly added attendees who will receive fresh Clearance PINs.
    - ⏸️ **Unchanged**: Attendees whose records match the current database.
    - ⚠️ **Issues / Errors**: Highlights any missing required fields before processing.
  - **Ticket & PIN Preservation**: Existing attendees retain their original Clearance PINs and QR codes so pre-printed badges or existing guest tickets remain valid.
  - **Notification Safeguards**: Emails to new or modified attendees are opt-in and unchecked by default, ensuring last-minute roster adjustments do not trigger unexpected email blasts.
  - **On-The-Fly Sync**: Click **"Confirm & Apply Changes On The Fly"** to atomically sync all changes directly into the live manifest.
- **Manual Control**: If a guest arrives without their QR code, you can manually click **"Check In"** next to their name. You can also click it again to **"Check Out"** if needed.

---

## 4. Live Scanner Operations
The **Live Scanner** is designed for high-speed, on-site entry management.

- **Initialize**: Click "Initialize Scanner" to wake the camera. 
- **Scanning**: Point the mobile device at a guest's QR code.
    - **Green Screen**: Check-in Successful.
    - **Yellow Screen**: Warning—the attendee is already checked in (prevents duplicate entry).
- **Camera Selection**: The app automatically prefers the back (environment) camera for easier scanning.
- **Manual PIN**: If a QR code is unreadable, enter the 4-digit **Unique Clearance ID** (found in the guest's email) in the "Manual PIN Entry" section.

---

## 5. Communications (Broadcasts)
Send instant updates to your confirmed attendees.

- **Targeting**: Messages are sent only to guests with a "Confirmed" status.
- **Customization**: Set a specific subject line and a personal signature.
- **Safety**: A confirmation dialog will appear before dispatching to ensure you don't send accidentally.

---

## 6. Global Analytics
Visit the **Command Analytics** page to see your platform's overall performance.

- **Check-in Rates**: Monitor what percentage of your total registrants have physically arrived.
- **Volume Metrics**: Track total events created and total guests managed across the entire platform.

---

## 7. Restoration & Safety
- **Stability Tag**: We have established a `v1.5-ms-auth-ready` restore point. This version includes the finalized Microsoft 365 OAuth integration and optimized routing architecture.
- **Secure Access**: Ensure all staff use authorized credentials. Access to the Command Center is restricted to Admin, Manager, and Staff roles.

---

**BMD Computing**
*Redefining Event Registration.*
