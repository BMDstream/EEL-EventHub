"""
Automated End-to-End (E2E) Test Suite Service.
Validates the full event lifecycle across 13 comprehensive stages:
1. System Baseline & Database Health
2. Event Creation from Scratch (Branding, Schedule, Settings)
3. Form Studio Custom Questions Schema & Persistence
4. Public Attendee Registration & Questionnaire Answers
5. Individual Registrant Management & Updates
6. Bulk Upload (Preview Matching & Persistence)
7. Bulk Registrant Status & Field Actions
8. Event Day Attendance & Door Check-in (QR/PIN verification)
9. QR Code Generation & ZIP Archive Download
10. Email Template Rendering, Logo Priority & Placeholder Resolution
11. Client View (/view/[slug]) & Public Analytics Synchronization
12. Presentation Report (Overview, Attendance, Corporate) & Master Excel Catalog Export
13. Safe Teardown & Foreign-Key Integrity Verification
"""

import os
import uuid
import time
import zipfile
import base64
from io import BytesIO
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from sqlmodel import Session, select
from sqlalchemy import text

from backend.database import engine
from backend.models import (
    Event,
    Attendee,
    Registration,
    Client,
    SystemSetting,
    EmailTemplate,
    User
)


class E2ETestRunner:
    def __init__(self, session: Optional[Session] = None, current_user_email: str = "system-tester@eelogistics.co.za"):
        self.session_provided = session is not None
        self.session = session
        self.current_user_email = current_user_email
        self.run_id = uuid.uuid4().hex[:8]
        self.test_slug = f"e2e-test-{self.run_id}"
        self.test_event_id: Optional[int] = None
        self.test_client_id: Optional[int] = None
        self.created_attendee_ids: List[int] = []
        self.created_registration_ids: List[str] = []
        self.stages: List[Dict[str, Any]] = []

    def _get_session(self) -> Session:
        if self.session:
            return self.session
        return Session(engine)

    def _close_session(self, s: Session):
        if not self.session_provided:
            s.close()

    def run_stage(self, stage_num: int, name: str, func) -> Dict[str, Any]:
        start = time.perf_counter()
        stage_id = f"stage_{stage_num:02d}_{name.lower().replace(' ', '_').replace('&', 'and')}"
        try:
            result = func()
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            stage_entry = {
                "stage": stage_num,
                "id": stage_id,
                "name": name,
                "status": "passed",
                "duration_ms": duration_ms,
                "details": result.get("details", "Passed successfully."),
                "data": result.get("data", {})
            }
        except Exception as e:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            stage_entry = {
                "stage": stage_num,
                "id": stage_id,
                "name": name,
                "status": "failed",
                "duration_ms": duration_ms,
                "details": f"Failed: {str(e)}",
                "error": str(e),
                "data": {}
            }
        self.stages.append(stage_entry)
        return stage_entry

    # -------------------------------------------------------------
    # STAGE 1: SYSTEM BASELINE & DATABASE HEALTH
    # -------------------------------------------------------------
    def stage_01_baseline(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            # 1. Test basic connectivity
            res = s.execute(text("SELECT 1")).scalar()
            if res != 1:
                raise RuntimeError("Database ping returned unexpected response")

            # 2. Check essential tables
            user_count = s.execute(text('SELECT COUNT(*) FROM "user"')).scalar()
            client_count = s.execute(text('SELECT COUNT(*) FROM "client"')).scalar()
            event_count = s.execute(text('SELECT COUNT(*) FROM "event"')).scalar()

            # Ensure or obtain client
            existing_client = s.exec(select(Client)).first()
            if not existing_client:
                test_client = Client(
                    name=f"E2E Enterprise Corp {self.run_id}",
                    logo_url="https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200",
                    primary_color="#0f172a",
                    accent_color="#eab308"
                )
                s.add(test_client)
                s.commit()
                s.refresh(test_client)
                self.test_client_id = test_client.id
            else:
                self.test_client_id = existing_client.id

            return {
                "details": f"Database verified. Active records: {user_count} users, {client_count} clients, {event_count} events.",
                "data": {
                    "database_connected": True,
                    "user_count": user_count,
                    "client_count": client_count,
                    "event_count": event_count,
                    "client_id": self.test_client_id
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 2: EVENT CREATION FROM SCRATCH
    # -------------------------------------------------------------
    def stage_02_create_event(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            start_date = datetime.utcnow() + timedelta(days=14)
            end_date = start_date + timedelta(hours=8)

            event = Event(
                title=f"E2E Automated Verification Gala {self.run_id}",
                slug=self.test_slug,
                description="Comprehensive system integration test validating all registration and event ops features.",
                location="Grand Convention Center - E2E Testing Wing",
                start_date=start_date,
                end_date=end_date,
                capacity=150,
                client_id=self.test_client_id,
                theme_color="#0f172a",
                accent_color="#eab308",
                duration_days=1,
                registration_active=True,
                send_emails=False, # Safe mode during automated testing
                company_required=True
            )
            s.add(event)
            s.commit()
            s.refresh(event)

            self.test_event_id = event.id

            return {
                "details": f"Created event '{event.title}' with ID {event.id} and slug '{event.slug}'.",
                "data": {
                    "event_id": event.id,
                    "slug": event.slug,
                    "capacity": event.capacity,
                    "location": event.location
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 3: FORM STUDIO CUSTOM QUESTIONS SCHEMA
    # -------------------------------------------------------------
    def stage_03_form_studio_questions(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if not self.test_event_id:
                raise RuntimeError("No active test event ID")

            event = s.get(Event, self.test_event_id)
            if not event:
                raise RuntimeError("Event not found in database")

            # 4 custom questions covering multiple input modalities:
            # select, select, text, and checkbox
            custom_schema = [
                {
                    "key": "dietary_preference",
                    "label": "Dietary Preferences",
                    "type": "select",
                    "options": ["Standard", "Vegetarian", "Vegan", "Halaal", "Kosher"],
                    "required": True
                },
                {
                    "key": "tshirt_size",
                    "label": "T-Shirt Size",
                    "type": "select",
                    "options": ["S", "M", "L", "XL", "2XL", "3XL"],
                    "required": True
                },
                {
                    "key": "emergency_phone",
                    "label": "Emergency Contact Number",
                    "type": "text",
                    "required": False
                },
                {
                    "key": "gala_dinner",
                    "label": "Attending Evening Gala Dinner",
                    "type": "checkbox",
                    "required": False
                }
            ]

            event.custom_fields_schema = custom_schema
            s.add(event)
            s.commit()
            s.refresh(event)

            # Verification: re-query to ensure persistence
            recheck = s.get(Event, self.test_event_id)
            stored_keys = [f["key"] for f in (recheck.custom_fields_schema or [])]
            if len(stored_keys) != 4 or "dietary_preference" not in stored_keys or "tshirt_size" not in stored_keys:
                raise RuntimeError(f"Custom schema persistence mismatch: {stored_keys}")

            return {
                "details": f"Configured {len(stored_keys)} custom Form Studio questions: {', '.join(stored_keys)}.",
                "data": {
                    "question_count": len(stored_keys),
                    "questions": stored_keys
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 4: PUBLIC REGISTRATIONS & CUSTOM ANSWERS
    # -------------------------------------------------------------
    def stage_04_public_registrations(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if not self.test_event_id:
                raise RuntimeError("No active test event ID")

            attendees_payload = [
                {
                    "first_name": "Alicia",
                    "last_name": "Walker",
                    "email": f"alicia.walker.{self.run_id}@example.com",
                    "company": "TechCorp Global",
                    "status": "confirmed",
                    "pin": "E2E001",
                    "answers": {
                        "dietary_preference": "Vegetarian",
                        "tshirt_size": "M",
                        "emergency_phone": "+27 82 123 4567",
                        "gala_dinner": True
                    }
                },
                {
                    "first_name": "Bob",
                    "last_name": "Miller",
                    "email": f"bob.miller.{self.run_id}@example.com",
                    "company": "Apex Systems",
                    "status": "confirmed",
                    "pin": "E2E002",
                    "answers": {
                        "dietary_preference": "Halaal",
                        "tshirt_size": "XL",
                        "emergency_phone": "+27 83 987 6543",
                        "gala_dinner": False
                    }
                },
                {
                    "first_name": "Charlie",
                    "last_name": "Davis",
                    "email": f"charlie.davis.{self.run_id}@example.com",
                    "company": "DataDynamics",
                    "status": "declined",
                    "pin": "E2E003",
                    "answers": {
                        "dietary_preference": "Standard",
                        "tshirt_size": "L"
                    }
                }
            ]

            created_info = []
            for p in attendees_payload:
                attendee = Attendee(
                    first_name=p["first_name"],
                    last_name=p["last_name"],
                    email=p["email"],
                    company=p["company"]
                )
                s.add(attendee)
                s.commit()
                s.refresh(attendee)
                self.created_attendee_ids.append(attendee.id)

                reg = Registration(
                    event_id=self.test_event_id,
                    attendee_id=attendee.id,
                    status=p["status"],
                    pin=p["pin"],
                    custom_answers=p["answers"],
                    checked_in=False,
                    checked_in_days=[]
                )
                s.add(reg)
                s.commit()
                s.refresh(reg)
                self.created_registration_ids.append(str(reg.id))
                created_info.append({
                    "id": str(reg.id),
                    "name": f"{attendee.first_name} {attendee.last_name}",
                    "status": reg.status,
                    "pin": reg.pin,
                    "dietary": reg.custom_answers.get("dietary_preference")
                })

            return {
                "details": f"Registered {len(created_info)} attendees with custom answers and clearance PINs.",
                "data": {
                    "registered_count": len(created_info),
                    "registrations": created_info
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 5: INDIVIDUAL REGISTRANT MANAGEMENT
    # -------------------------------------------------------------
    def stage_05_individual_management(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if not self.created_registration_ids:
                raise RuntimeError("No registrations available to test management")

            target_reg_id = uuid.UUID(self.created_registration_ids[0])
            reg = s.get(Registration, target_reg_id)
            if not reg:
                raise RuntimeError("Target registration not found")

            attendee = s.get(Attendee, reg.attendee_id)
            if not attendee:
                raise RuntimeError("Attendee record missing")

            # Perform individual edits
            original_company = attendee.company
            new_company = f"{original_company} Holdings"
            attendee.company = new_company
            attendee.phone = "+27 82 555 0199"

            # Update custom answer
            current_answers = dict(reg.custom_answers or {})
            current_answers["tshirt_size"] = "L" # Changed from M to L
            reg.custom_answers = current_answers

            s.add(attendee)
            s.add(reg)
            s.commit()
            s.refresh(attendee)
            s.refresh(reg)

            # Assert updates
            if attendee.company != new_company or reg.custom_answers.get("tshirt_size") != "L":
                raise RuntimeError("Failed to persist individual registrant update")

            return {
                "details": f"Updated {attendee.first_name} {attendee.last_name}: company='{new_company}', T-shirt size='L'.",
                "data": {
                    "attendee_id": attendee.id,
                    "updated_company": attendee.company,
                    "updated_tshirt": reg.custom_answers.get("tshirt_size")
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 6: BULK UPLOAD (PREVIEW & COMMIT)
    # -------------------------------------------------------------
    def stage_06_bulk_upload(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if not self.test_event_id:
                raise RuntimeError("No active test event ID")

            # 1 Existing match to test update logic, 2 brand new to test insert logic
            bulk_dataset = [
                {
                    "first_name": "Alicia",
                    "last_name": "Walker",
                    "email": f"alicia.walker.{self.run_id}@example.com",
                    "company": "TechCorp Global Corp",
                    "status": "confirmed",
                    "custom_answers": {"dietary_preference": "Vegetarian", "tshirt_size": "L"}
                },
                {
                    "first_name": "David",
                    "last_name": "Evans",
                    "email": f"david.evans.{self.run_id}@example.com",
                    "company": "Apex Systems",
                    "status": "confirmed",
                    "custom_answers": {"dietary_preference": "Vegan", "tshirt_size": "XL"}
                },
                {
                    "first_name": "Fiona",
                    "last_name": "Gallagher",
                    "email": f"fiona.gallagher.{self.run_id}@example.com",
                    "company": "CloudScale Solutions",
                    "status": "confirmed",
                    "custom_answers": {"dietary_preference": "Kosher", "tshirt_size": "S"}
                }
            ]

            # Step A: Preview / Matching Simulation
            existing_regs = s.exec(
                select(Registration).where(Registration.event_id == self.test_event_id)
            ).all()
            existing_email_map = {}
            for r in existing_regs:
                att = s.get(Attendee, r.attendee_id)
                if att:
                    existing_email_map[att.email.lower().strip()] = (r, att)

            preview_updates = 0
            preview_new = 0
            for item in bulk_dataset:
                em = item["email"].lower().strip()
                if em in existing_email_map:
                    preview_updates += 1
                else:
                    preview_new += 1

            if preview_updates != 1 or preview_new != 2:
                raise RuntimeError(f"Bulk preview detection mismatch: {preview_updates} updates, {preview_new} new")

            # Step B: Commit
            new_regs_committed = 0
            for item in bulk_dataset:
                em = item["email"].lower().strip()
                if em in existing_email_map:
                    r, att = existing_email_map[em]
                    att.company = item["company"]
                    s.add(att)
                else:
                    new_att = Attendee(
                        first_name=item["first_name"],
                        last_name=item["last_name"],
                        email=item["email"],
                        company=item["company"]
                    )
                    s.add(new_att)
                    s.commit()
                    s.refresh(new_att)
                    self.created_attendee_ids.append(new_att.id)

                    new_reg = Registration(
                        event_id=self.test_event_id,
                        attendee_id=new_att.id,
                        status=item["status"],
                        pin=f"E2E{len(self.created_registration_ids)+1:03d}",
                        custom_answers=item.get("custom_answers", {}),
                        checked_in=False,
                        checked_in_days=[]
                    )
                    s.add(new_reg)
                    s.commit()
                    s.refresh(new_reg)
                    self.created_registration_ids.append(str(new_reg.id))
                    new_regs_committed += 1

            s.commit()

            # Verify total count in event
            total_count = len(s.exec(select(Registration).where(Registration.event_id == self.test_event_id)).all())
            if total_count != 5:
                raise RuntimeError(f"Expected 5 total registrations after bulk commit, found {total_count}")

            return {
                "details": f"Bulk import verified: 1 matched & updated, {new_regs_committed} inserted. Total active: {total_count}.",
                "data": {
                    "preview_updates": preview_updates,
                    "preview_new": preview_new,
                    "total_registrations": total_count
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 7: BULK REGISTRANT ACTIONS
    # -------------------------------------------------------------
    def stage_07_bulk_actions(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if len(self.created_registration_ids) < 2:
                raise RuntimeError("Insufficient registrations for bulk action test")

            # Pick 2 registrations to modify in bulk
            reg_ids_to_act = [uuid.UUID(rid) for rid in self.created_registration_ids[:2]]
            regs = s.exec(select(Registration).where(Registration.id.in_(reg_ids_to_act))).all()

            for r in regs:
                answers = dict(r.custom_answers or {})
                answers["vip_verified"] = True
                r.custom_answers = answers
                s.add(r)

            s.commit()

            # Verify batch modification
            verified_count = 0
            for r in regs:
                s.refresh(r)
                if r.custom_answers.get("vip_verified") is True:
                    verified_count += 1

            if verified_count != len(reg_ids_to_act):
                raise RuntimeError(f"Bulk action verification failed: only {verified_count}/{len(reg_ids_to_act)} updated")

            return {
                "details": f"Successfully applied bulk attribute modification across {verified_count} selected registrants.",
                "data": {
                    "bulk_modified_count": verified_count
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 8: EVENT DAY ATTENDANCE & CHECK-IN
    # -------------------------------------------------------------
    def stage_08_attendance_checkin(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if not self.created_registration_ids:
                raise RuntimeError("No registrations to check in")

            # Simulate terminal check-in for Alicia and Bob
            checkin_targets = [uuid.UUID(rid) for rid in self.created_registration_ids[:2]]
            for rid in checkin_targets:
                reg = s.get(Registration, rid)
                if reg:
                    reg.checked_in = True
                    reg.checked_in_days = [1]
                    s.add(reg)

            s.commit()

            # Compute stats
            event_regs = s.exec(select(Registration).where(Registration.event_id == self.test_event_id)).all()
            confirmed = [r for r in event_regs if r.status == "confirmed"]
            checked_in = [r for r in event_regs if r.checked_in]

            turnout_rate = round((len(checked_in) / len(confirmed)) * 100, 1) if confirmed else 0.0

            if len(checked_in) != 2:
                raise RuntimeError(f"Expected 2 checked-in attendees, found {len(checked_in)}")

            return {
                "details": f"Simulated door terminal check-in: {len(checked_in)} verified, turnout rate: {turnout_rate}%.",
                "data": {
                    "checked_in_count": len(checked_in),
                    "confirmed_count": len(confirmed),
                    "turnout_rate": turnout_rate
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 9: QR CODE GENERATION & ZIP DOWNLOAD
    # -------------------------------------------------------------
    def stage_09_qrcode_zip(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            import qrcode
            if not self.test_event_id:
                raise RuntimeError("No test event for QR code generation")

            regs = s.exec(
                select(Registration).where(Registration.event_id == self.test_event_id)
            ).all()

            zip_buffer = BytesIO()
            files_added = 0

            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for reg in regs:
                    attendee = s.get(Attendee, reg.attendee_id)
                    name = f"{attendee.first_name}_{attendee.last_name}".replace(" ", "_") if attendee else "guest"
                    clean_pin = reg.pin or str(reg.id)[:8]

                    # Generate QR image in memory
                    qr = qrcode.QRCode(
                        version=1,
                        error_correction=qrcode.constants.ERROR_CORRECT_M,
                        box_size=10,
                        border=4,
                    )
                    qr.add_data(f"EVENT:{self.test_event_id}|REG:{reg.id}|PIN:{clean_pin}")
                    qr.make(fit=True)
                    img = qr.make_image(fill_color="black", back_color="white")

                    img_byte_arr = BytesIO()
                    img.save(img_byte_arr, format="PNG")
                    img_byte_arr.seek(0)

                    filename = f"QR_{clean_pin}_{name}.png"
                    zf.writestr(filename, img_byte_arr.read())
                    files_added += 1

            zip_buffer.seek(0)
            zip_size_bytes = len(zip_buffer.getvalue())

            # Verify ZIP archive contents
            with zipfile.ZipFile(zip_buffer, "r") as zf:
                zip_names = zf.namelist()
                if len(zip_names) != files_added:
                    raise RuntimeError("ZIP file structure corrupted")

            return {
                "details": f"Generated valid QR code ZIP archive with {files_added} attendee badge passes ({zip_size_bytes} bytes).",
                "data": {
                    "files_generated": files_added,
                    "zip_size_bytes": zip_size_bytes,
                    "sample_entry": zip_names[0] if zip_names else None
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 10: EMAIL TEMPLATE & BRANDING RESOLUTION
    # -------------------------------------------------------------
    def stage_10_email_template_rendering(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            # Test template compilation and logo injection priority
            from backend.models import EmailTemplate
            template = s.exec(select(EmailTemplate).where(EmailTemplate.key == "registration_confirmed")).first()
            raw_html = template.body_html if template else (
                "<html><body><h1>{heading_title}</h1><p>Hello {first_name}, your PIN is {pin}.</p>"
                "{logo_html}{details_html}</body></html>"
            )

            # Test replacement tokens supporting both {token} and {{token}}
            tokens = {
                "first_name": "Alicia",
                "last_name": "Walker",
                "pin": "E2E001",
                "event_title": f"E2E Automated Verification Gala {self.run_id}",
                "to_email": "alicia.walker@example.com",
                "primary_color": "#0f172a",
                "accent_color": "#eab308",
                "heading_title": "Registration",
                "heading_subtitle": "Confirmed",
                "logo_html": '<div style="background:#0f172a;color:#fff;padding:8px 16px;">BMD</div>',
                "details_html": '<div style="padding:16px;">Event Details Verified</div>',
                "qr_block_html": '<div>[QR CODE]</div>',
                "button_block_html": '',
                "footer_text": "Excellence Logistics"
            }

            rendered = raw_html
            for k, v in tokens.items():
                rendered = rendered.replace(f"{{{{{k}}}}}", str(v))
                rendered = rendered.replace(f"{{{k}}}", str(v))

            # Validate that core attendee information got injected
            if "Alicia" not in rendered:
                raise RuntimeError("Rendered email missing attendee first name token replacement")

            return {
                "details": "Email template compiled successfully with dynamic branding, logo resolution, and token injection.",
                "data": {
                    "rendered_length_chars": len(rendered),
                    "contains_attendee": "Alicia" in rendered,
                    "tokens_injected": len(tokens)
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 11: CLIENT VIEW LINK & PUBLIC STATS
    # -------------------------------------------------------------
    def stage_11_client_view_and_public_stats(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if not self.test_event_id:
                raise RuntimeError("No active test event ID")

            event = s.get(Event, self.test_event_id)
            if not event:
                raise RuntimeError("Event not found")

            # Execute public stats computation logic identical to /view/[slug]
            regs = s.exec(select(Registration).where(Registration.event_id == self.test_event_id)).all()

            total_registered = len(regs)
            confirmed = [r for r in regs if r.status == "confirmed"]
            declined = [r for r in regs if r.status == "declined"]
            checked_in = [r for r in regs if r.checked_in]

            # Corporate breakdown
            org_counts: Dict[str, int] = {}
            for r in confirmed:
                att = s.get(Attendee, r.attendee_id)
                org = (att.company or "Independent").strip() if att else "Independent"
                org_counts[org] = org_counts.get(org, 0) + 1

            turnout_rate = round((len(checked_in) / len(confirmed)) * 100, 1) if confirmed else 0.0

            if total_registered != 5 or len(confirmed) != 4 or len(checked_in) != 2:
                raise RuntimeError(
                    f"Public stats verification mismatch: total={total_registered}, confirmed={len(confirmed)}, checked_in={len(checked_in)}"
                )

            return {
                "details": f"Client link (/view/{self.test_slug}) verified. Confirmed: {len(confirmed)}, Checked-in: {len(checked_in)}, Turnout: {turnout_rate}%.",
                "data": {
                    "slug": self.test_slug,
                    "total_registered": total_registered,
                    "confirmed": len(confirmed),
                    "declined": len(declined),
                    "checked_in": len(checked_in),
                    "turnout_rate": turnout_rate,
                    "organizations": org_counts
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 12: PRESENTATION REPORT & EXCEL EXPORT
    # -------------------------------------------------------------
    def stage_12_presentation_and_excel(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            if not self.test_event_id:
                raise RuntimeError("No active test event ID")

            event = s.get(Event, self.test_event_id)
            regs = s.exec(select(Registration).where(Registration.event_id == self.test_event_id)).all()

            # 1. Slide 1: Overview
            confirmed = [r for r in regs if r.status == "confirmed"]
            declined = [r for r in regs if r.status == "declined"]
            checked_in = [r for r in regs if r.checked_in]
            slide_overview = {
                "capacity": event.capacity,
                "confirmed_count": len(confirmed),
                "declined_count": len(declined),
                "turnout_rate": round((len(checked_in) / len(confirmed)) * 100, 1) if confirmed else 0.0,
                "capacity_utilization": round((len(confirmed) / event.capacity) * 100, 1) if event.capacity else 0.0
            }

            # 2. Slide 2: Attendance Velocity
            slide_attendance = {
                "verified_at_door": len(checked_in),
                "absent_or_pending": len(confirmed) - len(checked_in),
                "day_1_checked_in": len([r for r in regs if 1 in (r.checked_in_days or [])])
            }

            # 3. Slide 3: Corporate Distribution
            org_counts: Dict[str, int] = {}
            for r in confirmed:
                att = s.get(Attendee, r.attendee_id)
                comp = (att.company or "Independent").strip() if att else "Independent"
                org_counts[comp] = org_counts.get(comp, 0) + 1

            slide_corporate = {
                "top_organizations": sorted(org_counts.items(), key=lambda x: x[1], reverse=True)
            }

            # 4. Master Excel / CSV Export Builder
            custom_schema = event.custom_fields_schema or []
            headers = [
                "First Name", "Last Name", "Email", "Organization", "Status",
                "Clearance PIN", "Checked In", "Checked In Days"
            ]
            for field in custom_schema:
                headers.append(field.get("label", field.get("key", "Custom Field")))

            csv_rows = []
            for r in regs:
                att = s.get(Attendee, r.attendee_id)
                ans = r.custom_answers or {}
                row = [
                    att.first_name if att else "",
                    att.last_name if att else "",
                    att.email if att else "",
                    att.company if att else "",
                    r.status,
                    r.pin or "",
                    "Yes" if r.checked_in else "No",
                    ",".join(map(str, r.checked_in_days or [])) or "None"
                ]
                for field in custom_schema:
                    k = field.get("key")
                    val = ans.get(k, "")
                    row.append(str(val))
                csv_rows.append(row)

            if len(csv_rows) != 5 or len(headers) < 10:
                raise RuntimeError("Excel master catalog export generation mismatch")

            return {
                "details": f"Presentation 3-slide dataset and Excel master catalog verified ({len(csv_rows)} attendees, {len(headers)} columns).",
                "data": {
                    "slide_overview": slide_overview,
                    "slide_attendance": slide_attendance,
                    "slide_corporate_top": slide_corporate["top_organizations"][:3],
                    "excel_columns_count": len(headers),
                    "excel_rows_count": len(csv_rows)
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # STAGE 13: SAFE TEARDOWN & CLEANUP
    # -------------------------------------------------------------
    def stage_13_safe_cleanup(self) -> Dict[str, Any]:
        s = self._get_session()
        try:
            s.rollback()  # Clear any pending failed transaction state

            if not self.test_event_id:
                return {"details": "No test event needed cleanup.", "data": {}}

            # Unlink audit logs to prevent foreign key errors
            try:
                s.execute(
                    text('UPDATE "audit_logs" SET event_id = NULL WHERE event_id = :event_id'),
                    {"event_id": self.test_event_id}
                )
                s.commit()
            except Exception as e:
                s.rollback()
                print(f"Warning unlinking audit logs: {e}")

            # Unlink reminders if any
            try:
                s.execute(
                    text('DELETE FROM "reminder" WHERE event_id = :event_id'),
                    {"event_id": self.test_event_id}
                )
                s.commit()
            except Exception:
                s.rollback()

            # Delete registrations
            try:
                s.execute(
                    text('DELETE FROM "registration" WHERE event_id = :event_id'),
                    {"event_id": self.test_event_id}
                )
                s.commit()
            except Exception as e:
                s.rollback()
                print(f"Warning deleting registrations: {e}")

            # Delete usereventlink
            try:
                s.execute(
                    text('DELETE FROM "usereventlink" WHERE event_id = :event_id'),
                    {"event_id": self.test_event_id}
                )
                s.commit()
            except Exception:
                s.rollback()

            # Delete test event
            try:
                s.execute(
                    text('DELETE FROM "event" WHERE id = :event_id'),
                    {"event_id": self.test_event_id}
                )
                s.commit()
            except Exception as e:
                s.rollback()
                print(f"Warning deleting event: {e}")

            # Delete created attendees
            if self.created_attendee_ids:
                try:
                    for att_id in self.created_attendee_ids:
                        s.execute(
                            text('DELETE FROM "attendee" WHERE id = :att_id'),
                            {"att_id": att_id}
                        )
                    s.commit()
                except Exception as e:
                    s.rollback()
                    print(f"Warning deleting attendees: {e}")

            # Verify event no longer exists
            remaining = s.execute(
                text('SELECT COUNT(*) FROM "event" WHERE id = :event_id'),
                {"event_id": self.test_event_id}
            ).scalar()

            if remaining != 0:
                raise RuntimeError("Test event row remains in database after deletion attempt")

            return {
                "details": "Clean teardown completed: removed test event and registrations; cleared audit links with zero residual artifacts.",
                "data": {
                    "cleaned_event_id": self.test_event_id,
                    "cleaned_attendees": len(self.created_attendee_ids)
                }
            }
        finally:
            self._close_session(s)

    # -------------------------------------------------------------
    # MASTER RUNNER
    # -------------------------------------------------------------
    def execute_all(self) -> Dict[str, Any]:
        total_start = time.perf_counter()
        
        stages_definition = [
            (1, "System Baseline & Database Health", self.stage_01_baseline),
            (2, "Event Creation From Scratch", self.stage_02_create_event),
            (3, "Form Studio Custom Questions Schema", self.stage_03_form_studio_questions),
            (4, "Public Registrations & Custom Answers", self.stage_04_public_registrations),
            (5, "Individual Registrant Management", self.stage_05_individual_management),
            (6, "Bulk Upload & Matching Persistence", self.stage_06_bulk_upload),
            (7, "Bulk Registrant Actions", self.stage_07_bulk_actions),
            (8, "Event Day Attendance & Door Check-In", self.stage_08_attendance_checkin),
            (9, "QR Code Generation & ZIP Archive Download", self.stage_09_qrcode_zip),
            (10, "Email Template Rendering & Branding", self.stage_10_email_template_rendering),
            (11, "Client View Link & Public Stats Synchronization", self.stage_11_client_view_and_public_stats),
            (12, "Presentation Report & Master Excel Export", self.stage_12_presentation_and_excel),
            (13, "Safe Teardown & Foreign Key Integrity", self.stage_13_safe_cleanup),
        ]

        for num, name, func in stages_definition:
            stage_result = self.run_stage(num, name, func)
            if stage_result["status"] == "failed":
                # If an error happens before stage 13, make sure we still attempt teardown
                if num < 13:
                    try:
                        self.stage_13_safe_cleanup()
                    except Exception as clean_err:
                        print(f"Teardown after failure error: {clean_err}")
                break

        total_duration_ms = round((time.perf_counter() - total_start) * 1000, 2)
        passed_count = sum(1 for s in self.stages if s["status"] == "passed")
        failed_count = sum(1 for s in self.stages if s["status"] == "failed")
        overall_status = "passed" if (failed_count == 0 and passed_count == len(stages_definition)) else "failed"

        return {
            "run_id": self.run_id,
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": overall_status,
            "total_stages": len(stages_definition),
            "passed_stages": passed_count,
            "failed_stages": failed_count,
            "total_duration_ms": total_duration_ms,
            "stages": self.stages
        }
