# BMD-EventHub: Feature Roadmap & Pipeline

This document tracks planned monthly milestones, feature requests, and pipeline tasks. We aim to release major updates once a month.

---

## 📅 6-Month Release Schedule (2026)

### 📌 July 2026 (Release 1.6) - Automated Communications & Reminders
*Target Release Date: July 15, 2026*
* **[ ] Automated Pre-Event Reminders**: Built-in scheduled email queues (via Resend) to send reminders (e.g., 24 hours and 1 hour before start time) containing the attendee's personalized QR Code and Unique Clearance ID.
* **[ ] SMS & WhatsApp Ticket Dispatch**: Support for optional text message confirmations with a direct link to the attendee's check-in QR code.
* **[ ] Branch Sync & CI/CD**: Sync preview/staging branch changes back to main and automate verification tests.

### 📌 August 2026 (Release 1.7) - Badging & Physical Ticket Upgrades
*Target Release Date: August 15, 2026*
* **[ ] PDF Ticket & Badge Generation**: Auto-generate print-ready PDF badges with the attendee's name, organization, and QR code, formatted for standard thermal label printers (Brother/Zebra) or standard letter sheets.
* **[ ] Mobile Wallet Integration**: Add support for generating Apple Wallet (`.pkpass`) and Google Wallet files so attendees can add tickets to their native device wallets.

### 📌 September 2026 (Release 1.8) - Breakout Sessions & Multi-Track Events
*Target Release Date: September 15, 2026*
* **[ ] Session & Room Track Management**: Support defining sub-sessions (breakouts, workshops, keynotes) under a single event with specific room assignments.
* **[ ] Capacity Limits & Session Signup**: Let registrants sign up for specific sessions during registration with automated seating cap checks.
* **[ ] Sub-session Scanner Mode**: Update the Scanner app to filter by sub-session, allowing staff to track room capacity and verify attendance per session.

### 📌 October 2026 (Release 1.9) - Self-Service Kiosk Mode & Offline Operations
*Target Release Date: October 15, 2026*
* **[ ] Tablet Kiosk Interface**: A PIN-secured kiosk interface designed for tablets at the registration desk, allowing self-service name lookups, profile corrections, and manual check-ins.
* **[ ] Offline Scanner Mode**: Implement local storage (IndexedDB/LocalForage) caching in the scanner view so scanning continues uninterrupted during network drops, syncing scan logs once back online.

### 📌 November 2026 (Release 1.10) - Real-Time Analytics & Report Builder
*Target Release Date: November 15, 2026*
* **[ ] Live Wall-board Dashboard**: A real-time command center dashboard displaying live check-in counters, peak arrival time charts, and demographics for display on big screens.
* **[ ] Advanced Report Builder**: A custom exporter allowing admins to select specific custom Form Studio questions, check-in timestamps, and registration statuses to generate custom CSV/Excel files.

### 📌 December 2026 (Release 1.11) - Post-Event Loop & Integrations
*Target Release Date: December 15, 2026*
* **[ ] Automated Feedback Surveys**: Automatically email feedback survey links to checked-in attendees after the event closes.
* **[ ] Certificate of Attendance**: Generate and email customized PDF certificates of participation or professional development credits for checked-in attendees.
* **[ ] CRM Syncing (HubSpot/Salesforce)**: Sync registrant data and custom field answers directly to external CRMs or external Google Sheets/Excel spreadsheets.

---

## 💡 Pipeline Backlog & Future Ideas
* **Sponsor Lead Retrieval**: Allow sponsors to scan attendee QR codes (with consent) to gather leads.
* **Multi-Event Portals**: A unified dashboard for frequent attendees to view all their upcoming registrations and past history.
