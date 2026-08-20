import os
import sys
import argparse
from sqlmodel import Session, select

# Adjust path to import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine
from backend.models import Attendee, Registration

def main():
    parser = argparse.ArgumentParser(description="Update a registrant's email address.")
    parser.add_argument("--old-email", required=True, help="The current email address of the registrant.")
    parser.add_argument("--new-email", required=True, help="The new email address to assign.")
    args = parser.parse_args()

    old_email = args.old_email.strip().lower()
    new_email = args.new_email.strip().lower()

    if not old_email or not new_email:
        print("Error: Both old and new email addresses must be provided.")
        sys.exit(1)

    with Session(engine) as session:
        # Find the attendee
        attendees = session.exec(
            select(Attendee).where(Attendee.email == old_email)
        ).all()

        if not attendees:
            print(f"No attendee found with email: {old_email}")
            sys.exit(1)

        print(f"Found {len(attendees)} attendee(s) with email: {old_email}")
        for attendee in attendees:
            print(f"  - ID: {attendee.id}, Name: {attendee.first_name} {attendee.last_name}")
            
            # Show registrations
            registrations = session.exec(
                select(Registration).where(Registration.attendee_id == attendee.id)
            ).all()
            if registrations:
                print("    Registrations:")
                for reg in registrations:
                    event_title = reg.event.title if reg.event else "Unknown Event"
                    print(f"      * Event ID: {reg.event_id} ({event_title}), Status: {reg.status}")
            else:
                print("    No active event registrations.")

        # Check if the new email is already taken by another attendee
        existing_new_attendee = session.exec(
            select(Attendee).where(Attendee.email == new_email)
        ).first()

        if existing_new_attendee:
            print(f"\nWarning: An attendee record for '{new_email}' already exists (ID: {existing_new_attendee.id}, Name: {existing_new_attendee.first_name} {existing_new_attendee.last_name}).")
            # In this case, we might want to merge registrations or just alert. Let's warn.
            confirm = input("Would you like to transfer all registrations of the old attendee to the existing new attendee record? (y/N): ").strip().lower()
            if confirm == 'y':
                for attendee in attendees:
                    registrations = session.exec(
                        select(Registration).where(Registration.attendee_id == attendee.id)
                    ).all()
                    for reg in registrations:
                        # Check if already registered under new email for this event
                        already_registered = session.exec(
                            select(Registration)
                            .where(Registration.event_id == reg.event_id)
                            .where(Registration.attendee_id == existing_new_attendee.id)
                        ).first()
                        if already_registered:
                            print(f"      * Already registered for event {reg.event_id} under '{new_email}'. Skipping this registration.")
                        else:
                            print(f"      * Transferring registration for event {reg.event_id} to new attendee ID {existing_new_attendee.id}")
                            reg.attendee_id = existing_new_attendee.id
                            session.add(reg)
                    # Delete old attendee if they have no registrations left
                    session.delete(attendee)
                session.commit()
                print("Successfully transferred registrations and removed duplicate old profile.")
                sys.exit(0)
            else:
                print("Aborting. Please resolve the duplicate record manually or choose y to transfer registrations.")
                sys.exit(1)

        # Standard rename
        confirm = input(f"\nAre you sure you want to update the email from '{old_email}' to '{new_email}'? (y/N): ").strip().lower()
        if confirm != 'y':
            print("Cancelled.")
            sys.exit(0)

        for attendee in attendees:
            attendee.email = new_email
            session.add(attendee)

        # Check and update tournament players if applicable
        try:
            from backend.routers.tournament import Player
            players = session.exec(
                select(Player).where(Player.email == old_email)
            ).all()
            for player in players:
                print(f"Found tournament Player record for {old_email}. Updating to {new_email}...")
                player.email = new_email
                session.add(player)
        except Exception:
            # Tournament module not installed or different table layout
            pass

        session.commit()
        print(f"Successfully updated email to '{new_email}' for {len(attendees)} attendee(s).")

if __name__ == "__main__":
    main()
