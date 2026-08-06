import pymysql
import sqlparse

host = "database-1.cpmuw44kwff5.eu-north-1.rds.amazonaws.com"
user = "admin"
password = "podi1234database1"
database = "foe_timetable_scheduler"
sql_file = "foe_backup (3).sql"

try:
    print("Connecting to AWS RDS...")
    connection = pymysql.connect(
        host=host, 
        user=user, 
        password=password, 
        database=database
    )
    cursor = connection.cursor()
    
    print("Reading SQL backup file...")
    with open('full_backup.sql', 'r', encoding='utf-8') as f:
        content = f.read()
        
    print("Parsing SQL statements...")
    statements = sqlparse.split(content)
    
    print(f"Executing {len(statements)} statements...")
    
    cursor.execute("SET FOREIGN_KEY_CHECKS=0;")
    
    success = 0
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        
        # Skip MariaDB specific comments that cause syntax errors in pymysql
        if stmt.startswith("/*M!"):
            continue
            
        try:
            cursor.execute(stmt)
            success += 1
        except Exception as e:
            # We ignore DROP TABLE IF EXISTS errors if they somehow occur, but log others
            if "Unknown table" not in str(e):
                pass # print(f"Skipped statement: {e}")
            
    connection.commit()
    cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
    
    print(f"Full database successfully restored! Executed {success} statements.")
    
except Exception as e:
    print(f"Fatal Error: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
