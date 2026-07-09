import sqlite3
import os

db_path = r"e:\projects\python\Swaya\swaya.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, external_id, media_type, release_status, last_air_date FROM metadata_matches")
    rows = cursor.fetchall()
    with open("db_status.txt", "w") as f:
        f.write("DB Rows in metadata_matches:\n")
        for row in rows:
            f.write(f"{row}\n")
except Exception as e:
    with open("db_status.txt", "w") as f:
        f.write(f"Error: {e}\n")

conn.close()
print("Done writing db_status.txt")
