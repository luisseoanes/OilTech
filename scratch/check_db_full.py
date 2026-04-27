import sqlite3
import os

def check_db_full(path):
    print(f"Checking DB: {path}")
    if not os.path.exists(path):
        print("File does not exist.")
        return
    
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Tables: {tables}")
        
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"Table '{table}' count: {count}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)

check_db_full("oiltech.db")
check_db_full("backend/oiltech.db")
