import os
import psycopg2
import json
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

restored_schema = [
  {
    "id": "field_1779962054556",
    "label": "Dietary Requirements ",
    "type": "select",
    "required": True,
    "options": [
      "No Dietary Requirements",
      "Halaal",
      "Vegetarian Vegan",
      "Other"
    ]
  },
  {
    "id": "field_1779962096590",
    "label": "Other",
    "type": "text",
    "required": False,
    "dependsOn": {
      "fieldId": "field_1779962054556",
      "value": "Other"
    }
  },
  {
    "id": "field_1779962137331",
    "label": "Player or Spectator",
    "type": "select",
    "required": True,
    "inactive": True,
    "options": [
      "Player",
      "Spectator"
    ]
  },
  {
    "id": "field_1779962172868",
    "label": "Category",
    "type": "select",
    "required": False,
    "inactive": True,
    "options": [
      "Competitive",
      "Social"
    ],
    "dependsOn": {
      "fieldId": "field_1779962137331",
      "value": "Player"
    }
  },
  {
    "id": "field_1779962303585",
    "label": "T-Shirt Size",
    "type": "select",
    "required": False,
    "inactive": True,
    "options": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "dependsOn": {
      "fieldId": "field_1779962137331",
      "value": "Player"
    }
  },
  {
    "id": "field_1781088483505",
    "label": "Partner Details",
    "type": "partner_card",
    "required": False,
    "inactive": True,
    "dependsOn": {
      "fieldId": "field_1779962137331",
      "value": "Player"
    }
  },
  {
    "id": "field_1781158985365",
    "label": "Partner T-Shirt Size",
    "type": "select",
    "required": False,
    "inactive": True,
    "options": [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "dependsOn": {
      "fieldId": "field_1779962137331",
      "value": "Player"
    }
  }
]

def restore():
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        print("Restoring schema for Event 19 (DFA Padel Day 2026)...")
        schema_json = json.dumps(restored_schema)
        cur.execute(
            "UPDATE event SET custom_fields_schema = %s WHERE id = 19",
            (schema_json,)
        )
        conn.commit()
        print("Schema restored successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print("Error restoring schema:", e)

if __name__ == "__main__":
    restore()
