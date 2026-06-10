import os
import sqlite3

db_files = ["test.db", "stress_test.db"]

for db_file in db_files:
    if os.path.exists(db_file):
        print(f"Checking SQLite database {db_file}...")
        try:
            conn = sqlite3.connect(db_file)
            cursor = conn.cursor()
            cursor.execute("SELECT id, slug, title FROM event")
            rows = cursor.fetchall()
            print(f"Found {len(rows)} events in {db_file}:")
            for row in rows:
                print(f"  ID: {row[0]} | Slug: {row[1]} | Title: {repr(row[2])}")
            conn.close()
        except Exception as e:
            print(f"Error checking {db_file}: {e}")
    else:
        print(f"{db_file} does not exist.")
