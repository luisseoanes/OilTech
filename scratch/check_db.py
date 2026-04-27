import sqlite3
import os

def check_db(path):
    print(f"Checking DB: {path}")
    if not os.path.exists(path):
        print("File does not exist.")
        return
    
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        
        if ('products',) in tables:
            cursor.execute("SELECT COUNT(*) FROM products")
            count = cursor.fetchone()[0]
            print(f"Product count: {count}")
            if count > 0:
                cursor.execute("SELECT * FROM products LIMIT 5")
                print(f"First 5 products: {cursor.fetchall()}")
        else:
            print("Table 'products' does not exist.")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)

check_db("oiltech.db")
check_db("backend/oiltech.db")
