import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Gimaya@1234",
        database="foe_timetable_scheduler"
    )
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM lecturer")
    print("All Lecturers in DB:")
    for row in cursor.fetchall():
        print(row)
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
