import sys
import os
from sqlmodel import Session, SQLModel, select

# Adjust path to import backend modules correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine, init_db
from backend.models import SystemSetting, Client, EmailTemplate, RegistrationFormTemplate

def run_migrations():
    print("Starting database schema migration and seeding...")
    
    # 1. Initialize all SQLModel tables
    init_db()
    print("Database tables initialized.")

    with Session(engine) as session:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        
        # User permissions column
        user_columns = [col['name'] for col in inspector.get_columns('user')] if inspector.has_table('user') else []
        if user_columns and 'permissions' not in user_columns:
            try:
                session.execute(text('ALTER TABLE "user" ADD COLUMN permissions JSON'))
                session.commit()
                print("Permissions column added to user table.")
            except Exception as e:
                session.rollback()
                print(f"Permissions column error: {e}")

        # Userclientlink role column
        ucl_columns = [col['name'] for col in inspector.get_columns('userclientlink')] if inspector.has_table('userclientlink') else []
        if ucl_columns and 'role' not in ucl_columns:
            try:
                session.execute(text('ALTER TABLE "userclientlink" ADD COLUMN role TEXT DEFAULT \'staff\''))
                session.commit()
                print("Role column added to userclientlink table.")
                
                try:
                    session.execute(text('''
                        UPDATE "userclientlink"
                        SET role = 'manager'
                        WHERE user_id IN (SELECT id FROM "user" WHERE role = 'manager')
                    '''))
                    session.commit()
                    print("Migrated existing user roles to userclientlink links.")
                except Exception as e:
                    session.rollback()
                    print(f"Role migration warning: {e}")
            except Exception as e:
                session.rollback()
                print(f"Userclientlink role column error: {e}")

        # Usereventlink role column
        uel_columns = [col['name'] for col in inspector.get_columns('usereventlink')] if inspector.has_table('usereventlink') else []
        if uel_columns and 'role' not in uel_columns:
            try:
                session.execute(text('ALTER TABLE "usereventlink" ADD COLUMN role TEXT DEFAULT \'staff\''))
                session.commit()
                print("Role column added to usereventlink table.")
            except Exception as e:
                session.rollback()
                print(f"Usereventlink role column error: {e}")

        # Event fields
        event_columns = [col['name'] for col in inspector.get_columns('event')] if inspector.has_table('event') else []
        if event_columns:
            dialect_name = session.bind.dialect.name
            is_sqlite = dialect_name == "sqlite"
            
            bool_true = "1" if is_sqlite else "TRUE"
            bool_false = "0" if is_sqlite else "FALSE"
            datetime_type = "DATETIME" if is_sqlite else "TIMESTAMP"
            
            for col_name, col_type in [
                ("registration_active", f"BOOLEAN DEFAULT {bool_true}"),
                ("registration_start", datetime_type),
                ("registration_end", datetime_type),
                ("disclaimer_enabled", f"BOOLEAN DEFAULT {bool_false}"),
                ("disclaimer_text", "TEXT"),
                ("logo_url", "TEXT"),
                ("sender_email", "TEXT"),
                ("sender_name", "TEXT"),
                ("company_required", f"BOOLEAN DEFAULT {bool_false}"),
                ("background_url", "TEXT"),
                ("confirmation_template_key", "TEXT DEFAULT 'global'"),
                ("confirmation_template_id", "INTEGER"),
                ("decline_template_key", "TEXT DEFAULT 'global'"),
                ("decline_template_id", "INTEGER"),
                ("registration_form_template_id", "INTEGER")
            ]:
                if col_name not in event_columns:
                    try:
                        session.execute(text(f'ALTER TABLE "event" ADD COLUMN {col_name} {col_type}'))
                        session.commit()
                        print(f"Column '{col_name}' added to event table.")
                    except Exception as e:
                        session.rollback()
                        print(f"Column '{col_name}' error: {e}")

        # Client fields
        client_columns = [col['name'] for col in inspector.get_columns('client')] if inspector.has_table('client') else []
        if client_columns:
            for col_name, col_type in [
                ("font_family", "TEXT DEFAULT 'Calibri, sans-serif'"),
                ("font_size", "TEXT DEFAULT '16px'")
            ]:
                if col_name not in client_columns:
                    try:
                        session.execute(text(f'ALTER TABLE "client" ADD COLUMN {col_name} {col_type}'))
                        session.commit()
                        print(f"Column '{col_name}' added to client table.")
                    except Exception as e:
                        session.rollback()
                        print(f"Column '{col_name}' error: {e}")

        # Seed default settings
        default_email = session.exec(select(SystemSetting).where(SystemSetting.key == "email_config")).first()
        if not default_email:
            config = {
                "primary_color": "#0f172a",
                "accent_color": "#94a3b8",
                "heading_text": "Access Granted.",
                "body_text": "Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
                "footer_text": "Automated Event Management System\nSecurity Tier: Level 4 Authorized",
                "font_family": "Calibri, sans-serif",
                "font_size": "16px"
            }
            session.add(SystemSetting(key="email_config", value=config))
            session.commit()
            print("Default system email settings seeded.")
        else:
            config = default_email.value
            dirty = False
            if not config.get("font_family"):
                config["font_family"] = "Calibri, sans-serif"
                dirty = True
            if not config.get("font_size"):
                config["font_size"] = "16px"
                dirty = True
            if dirty:
                default_email.value = config
                session.add(default_email)
                session.commit()
                print("Updated default email settings with fonts.")

        # Seed default templates
        if inspector.has_table('emailtemplate'):
            from backend.default_templates import DEFAULT_TEMPLATES
            existing = session.exec(select(EmailTemplate)).all()
            existing_keys = {t.key for t in existing}
            added_any = False
            for k, val in DEFAULT_TEMPLATES.items():
                if k not in existing_keys:
                    session.add(EmailTemplate(
                        key=k,
                        name=val["name"],
                        subject=val["subject"],
                        body_html=val["body_html"]
                    ))
                    added_any = True
            if added_any:
                session.commit()
                print("Seeded missing default email templates.")

        # Seed default client
        default_client = session.exec(select(Client).where(Client.slug == "bmd")).first()
        if not default_client:
            default_client = Client(
                name="BMD Computing",
                slug="bmd",
                primary_color="#25678e",
                accent_color="#1d2a33",
                heading_text="Access Granted.",
                body_text="Your registration for **{event_title}** has been confirmed. Below are your secure credentials for terminal verification.",
                footer_text="Automated Event Management System\nSecurity Tier: Level 4 Authorized"
            )
            session.add(default_client)
            session.commit()
            print("Seeded default BMD client.")

        # Seed default registration form template
        default_form_template = session.exec(select(RegistrationFormTemplate)).first()
        if not default_form_template:
            default_form_template = RegistrationFormTemplate(
                name="Default Registration Form",
                description="Standard registration form layout with default settings and fields.",
                theme_config={
                    "background_pattern": "none",
                    "form_bg_color": "#ffffff",
                    "feedback_bg_color": "#f1f5f9",
                    "typography_font": "Calibri, sans-serif",
                    "force_sentence_case": True,
                    "strip_trailing_periods": True,
                    "force_text_visibility": True,
                    "attendeePassBgColor": "#000000",
                    "engagementDetailsColor": "#0f172a"
                },
                layout_schema=[
                    {
                        "id": "personal_info",
                        "title": "Personal Profile",
                        "fields": []
                    },
                    {
                        "id": "logistics",
                        "title": "Experience & Logistics",
                        "fields": [
                            {
                                "id": "attendance_status",
                                "label": "Are you attending?",
                                "type": "select",
                                "required": True,
                                "options": ["Yes, I will attend", "No, I cannot attend"]
                            },
                            {
                                "id": "dietary_requirements",
                                "label": "Dietary Requirements",
                                "type": "text",
                                "required": False,
                                "dependsOn": {
                                    "fieldId": "attendance_status",
                                    "value": "Yes, I will attend"
                                }
                            }
                        ]
                    }
                ],
                post_submit_config={
                    "onscreen_title": "YOUR REGISTRATION HAS BEEN CONFIRMED.",
                    "onscreen_description": "Your registration for [Event Name] is confirmed. Verification has been dispatched to [Email Address]",
                    "clearance_label": "UNIQUE CLEARANCE ID"
                }
            )
            session.add(default_form_template)
            session.commit()
            print("Seeded default registration form template.")

        # Seed additional templates
        sports_form = session.exec(select(RegistrationFormTemplate).where(RegistrationFormTemplate.name == "Sports & Team Day Form")).first()
        if not sports_form:
            sports_form = RegistrationFormTemplate(
                name="Sports & Team Day Form",
                description="Custom form for team sports days. Includes company select, emergency contacts, t-shirt sizes, spectator vs participant role, and sport selection.",
                theme_config={
                    "background_pattern": "none",
                    "form_bg_color": "#ffffff",
                    "feedback_bg_color": "#f1f5f9",
                    "typography_font": "Calibri, sans-serif",
                    "force_sentence_case": True,
                    "strip_trailing_periods": True,
                    "force_text_visibility": True,
                    "attendance_label": "Attendance Status",
                    "attending_label": "I am attending",
                    "not_attending_label": "Unable to attend",
                    "attendeePassBgColor": "#000000",
                    "engagementDetailsColor": "#0f172a"
                },
                layout_schema=[
                    {
                        "id": "personal_info",
                        "title": "Personal Profile",
                        "fields": [
                            {
                                "id": "company_name",
                                "label": "Company name",
                                "type": "select",
                                "required": True,
                                "options": ["BritelinkMCT", "DFA", "MAZIV", "Rise", "SADV", "Vumatel", "Vumacam"]
                            },
                            {
                                "id": "contact_number",
                                "label": "Contact number",
                                "type": "text",
                                "required": True
                            },
                            {
                                "id": "gender",
                                "label": "Gender",
                                "type": "select",
                                "required": True,
                                "options": ["Female", "Male"]
                            }
                        ]
                    },
                    {
                        "id": "logistics",
                        "title": "Experience & Logistics",
                        "fields": [
                            {
                                "id": "t_shirt_size",
                                "label": "T-shirt size",
                                "type": "select",
                                "required": True,
                                "options": ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"]
                            },
                            {
                                "id": "attending_role",
                                "label": "What will you be attending as?",
                                "type": "select",
                                "required": True,
                                "options": ["Participant", "Spectator"]
                            },
                            {
                                "id": "sport_selection",
                                "label": "List of possible sports",
                                "type": "select",
                                "required": True,
                                "options": ["Bowls", "Dodgeball", "Five-a-side-soccer", "Hockey", "Netball", "Pickleball"],
                                "dependsOn": {
                                    "fieldId": "attending_role",
                                    "value": "Participant"
                                }
                            }
                        ]
                    },
                    {
                        "id": "health_safety",
                        "title": "Health & Safety Details",
                        "fields": [
                            {
                                "id": "emergency_contact",
                                "label": "Emergency contact name and number",
                                "type": "text",
                                "required": True
                            },
                            {
                                "id": "dietary_requirements",
                                "label": "Dietary Requirements",
                                "type": "select",
                                "required": True,
                                "options": ["None", "Chicken only", "Halaal", "Kosher", "Vegan", "Vegetarian"]
                            },
                            {
                                "id": "allergies",
                                "label": "Please specify any medically diagnosed allergies",
                                "type": "text",
                                "required": True
                            }
                        ]
                    }
                ],
                post_submit_config={
                    "onscreen_title": "YOUR REGISTRATION HAS BEEN CONFIRMED.",
                    "onscreen_description": "Your registration for [Event Name] is confirmed. Verification has been dispatched to [Email Address]",
                    "clearance_label": "UNIQUE CLEARANCE ID"
                }
            )
            session.add(sports_form)
            print("Seeded sports form template.")

        golf_form = session.exec(select(RegistrationFormTemplate).where(RegistrationFormTemplate.name == "Golf Invitational Form")).first()
        if not golf_form:
            golf_form = RegistrationFormTemplate(
                name="Golf Invitational Form",
                description="Preconfigured layout for golf tournaments. Collects Handicap indexes, Glove hand selection, glove sizing, and non-transferable disclaimer agreement.",
                theme_config={
                    "background_pattern": "none",
                    "form_bg_color": "#ffffff",
                    "feedback_bg_color": "#f1f5f9",
                    "typography_font": "Calibri, sans-serif",
                    "force_sentence_case": True,
                    "strip_trailing_periods": True,
                    "force_text_visibility": True,
                    "attendance_label": "Attendance Status",
                    "attending_label": "I am attending",
                    "not_attending_label": "Unable to attend",
                    "attendeePassBgColor": "#000000",
                    "engagementDetailsColor": "#0f172a"
                },
                layout_schema=[
                    {
                        "id": "player_profile",
                        "title": "Player Profile",
                        "fields": [
                            {
                                "id": "contact_number",
                                "label": "Contact number",
                                "type": "text",
                                "required": True
                            },
                            {
                                "id": "handicap",
                                "label": "HNA Handicap Index",
                                "type": "text",
                                "required": True
                            },
                            {
                                "id": "gender",
                                "label": "Gender",
                                "type": "select",
                                "required": True,
                                "options": ["Male", "Female"]
                            }
                        ]
                    },
                    {
                        "id": "apparel_gear",
                        "title": "Apparel & Gear Sizing",
                        "fields": [
                            {
                                "id": "t_shirt_size",
                                "label": "T-shirt size",
                                "type": "select",
                                "required": True,
                                "options": ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
                            },
                            {
                                "id": "glove_hand",
                                "label": "Glove hand",
                                "type": "select",
                                "required": True,
                                "options": ["Left", "Right"]
                            },
                            {
                                "id": "glove_size",
                                "label": "Glove size",
                                "type": "text",
                                "required": True
                            }
                        ]
                    },
                    {
                        "id": "dietary_disclaimer",
                        "title": "Dietary & Policies",
                        "fields": [
                            {
                                "id": "dietary_requirements",
                                "label": "Dietary Requirements",
                                "type": "text",
                                "required": True
                            },
                            {
                                "id": "non_transferable",
                                "label": "Disclaimer: Non-Transferable",
                                "type": "checkbox",
                                "required": True
                            }
                        ]
                    }
                ],
                post_submit_config={
                    "onscreen_title": "YOUR REGISTRATION HAS BEEN CONFIRMED.",
                    "onscreen_description": "Your registration for [Event Name] is confirmed. Verification has been dispatched to [Email Address]",
                    "clearance_label": "UNIQUE CLEARANCE ID"
                }
            )
            session.add(golf_form)
            print("Seeded golf form template.")

        padel_form = session.exec(select(RegistrationFormTemplate).where(RegistrationFormTemplate.name == "Padel Championship Form")).first()
        if not padel_form:
            padel_form = RegistrationFormTemplate(
                name="Padel Championship Form",
                description="Optimized for padel and double-team rackets tournaments. Features player category selection, and conditional partner details card integration.",
                theme_config={
                    "background_pattern": "none",
                    "form_bg_color": "#ffffff",
                    "feedback_bg_color": "#f1f5f9",
                    "typography_font": "Calibri, sans-serif",
                    "force_sentence_case": True,
                    "strip_trailing_periods": True,
                    "force_text_visibility": True,
                    "attendance_label": "Attendance Status",
                    "attending_label": "I am attending",
                    "not_attending_label": "Unable to attend",
                    "attendeePassBgColor": "#000000",
                    "engagementDetailsColor": "#0f172a"
                },
                layout_schema=[
                    {
                        "id": "personal_profile",
                        "title": "Personal Profile",
                        "fields": [
                            {
                                "id": "dietary_requirements",
                                "label": "Dietary Requirements",
                                "type": "select",
                                "required": True,
                                "options": ["No Dietary Requirements", "Halaal", "Vegetarian", "Vegan", "Other"]
                            },
                            {
                                "id": "dietary_other",
                                "label": "Other",
                                "type": "text",
                                "required": False,
                                "dependsOn": {
                                    "fieldId": "dietary_requirements",
                                    "value": "Other"
                                }
                            }
                        ]
                    },
                    {
                        "id": "tournament_details",
                        "title": "Tournament Details",
                        "fields": [
                            {
                                "id": "entry_role",
                                "label": "Player or Spectator",
                                "type": "select",
                                "required": True,
                                "options": ["Player", "Spectator"]
                            },
                            {
                                "id": "padel_category",
                                "label": "Category",
                                "type": "select",
                                "required": False,
                                "options": ["Competitive", "Social"],
                                "dependsOn": {
                                    "fieldId": "entry_role",
                                    "value": "Player"
                                }
                            },
                            {
                                "id": "t_shirt_size",
                                "label": "T-Shirt Size",
                                "type": "select",
                                "required": False,
                                "options": ["XS", "S", "M", "L", "XL", "XXL"],
                                "dependsOn": {
                                    "fieldId": "entry_role",
                                    "value": "Player"
                                }
                            }
                        ]
                    },
                    {
                        "id": "double_partners",
                        "title": "Partner Details",
                        "fields": [
                            {
                                "id": "partner_card",
                                "label": "Partner Details",
                                "type": "partner_card",
                                "required": False,
                                "dependsOn": {
                                    "fieldId": "entry_role",
                                    "value": "Player"
                                }
                            },
                            {
                                "id": "partner_t_shirt",
                                "label": "Partner T-Shirt Size",
                                "type": "select",
                                "required": False,
                                "options": ["XS", "S", "M", "L", "XL", "XXL"],
                                "dependsOn": {
                                    "fieldId": "entry_role",
                                    "value": "Player"
                                }
                            }
                        ]
                    }
                ],
                post_submit_config={
                    "onscreen_title": "YOUR REGISTRATION HAS BEEN CONFIRMED.",
                    "onscreen_description": "Your registration for [Event Name] is confirmed. Verification has been dispatched to [Email Address]",
                    "clearance_label": "UNIQUE CLEARANCE ID"
                }
            )
            session.add(padel_form)
            print("Seeded padel form template.")

        original_rsvp = session.exec(select(RegistrationFormTemplate).where(RegistrationFormTemplate.name == "Original RSVP Form")).first()
        if not original_rsvp:
            original_rsvp = RegistrationFormTemplate(
                name="Original RSVP Form",
                description="The original minimal layout. Collects only name, email, and attendance confirmation using clean, big choice buttons.",
                theme_config={
                    "background_pattern": "none",
                    "form_bg_color": "#ffffff",
                    "feedback_bg_color": "#f1f5f9",
                    "typography_font": "Calibri, sans-serif",
                    "force_sentence_case": True,
                    "strip_trailing_periods": True,
                    "force_text_visibility": True,
                    "attendance_label": "Attendance Status",
                    "attending_label": "I am attending",
                    "not_attending_label": "Unable to attend",
                    "attendeePassBgColor": "#000000",
                    "engagementDetailsColor": "#0f172a"
                },
                layout_schema=[],
                post_submit_config={
                    "onscreen_title": "YOUR REGISTRATION HAS BEEN CONFIRMED.",
                    "onscreen_description": "Your registration for [Event Name] is confirmed. Verification has been dispatched to [Email Address]",
                    "clearance_label": "UNIQUE CLEARANCE ID"
                }
            )
            session.add(original_rsvp)
            print("Seeded original RSVP form template.")

            session.commit()
            print("Seeded default registration form templates.")

        # Sweep settings/clients
        sweep_completed = session.exec(select(SystemSetting).where(SystemSetting.key == "terminology_sweep_completed")).first()
        if not sweep_completed:
            from datetime import datetime
            print("Running database sweep...")
            settings_to_sweep = session.exec(select(SystemSetting)).all()
            for setting in settings_to_sweep:
                if isinstance(setting.value, dict):
                    updated = False
                    new_val = {}
                    for k, v in setting.value.items():
                        if isinstance(v, str):
                            new_v = v.replace("orchestration", "registration").replace("Orchestration", "Registration").replace("has been authorized", "has been confirmed")
                            if new_v != v:
                                updated = True
                            new_val[k] = new_v
                        else:
                            new_val[k] = v
                    if updated:
                        setting.value = new_val
                        session.add(setting)

            clients_to_sweep = session.exec(select(Client)).all()
            for client in clients_to_sweep:
                client_updated = False
                for attr in ["body_text", "heading_text", "footer_text"]:
                    val = getattr(client, attr)
                    if isinstance(val, str):
                        new_val = val.replace("orchestration", "registration").replace("Orchestration", "Registration").replace("has been authorized", "has been confirmed")
                        if new_val != val:
                            setattr(client, attr, new_val)
                            client_updated = True
                if client_updated:
                    session.add(client)
            
            session.add(SystemSetting(key="terminology_sweep_completed", value={"completed": True, "timestamp": datetime.utcnow().isoformat()}))
            session.commit()
            print("Database sweep correction complete.")

        # Seed tournament tables
        try:
            from backend.routers.tournament import Player, EventCheckin, Match
            Player.metadata.create_all(engine)
            print("Tournament tables created/verified.")
        except Exception as e:
            print(f"Tournament tables seeding warning: {e}")

        # Create indexes
        try:
            indexes_to_create = [
                ("idx_attendee_email", "attendee", "email"),
                ("idx_registration_event_id", "registration", "event_id"),
                ("idx_registration_attendee_id", "registration", "attendee_id"),
                ("idx_registration_pin", "registration", "pin"),
                ("idx_event_checkins_player_id", "event_checkins", "player_id"),
                ("idx_matches_challenger_id", "matches", "challenger_id"),
                ("idx_matches_partner_id", "matches", "partner_id"),
                ("idx_matches_status", "matches", "status")
            ]
            for idx_name, table, column in indexes_to_create:
                try:
                    session.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({column})"))
                    session.commit()
                except Exception:
                    session.rollback()
            print("Performance indexes verified/created.")
        except Exception as e:
            print(f"Performance indexes seeding warning: {e}")

    print("Database migrations and seeding completed successfully.")

if __name__ == "__main__":
    run_migrations()
