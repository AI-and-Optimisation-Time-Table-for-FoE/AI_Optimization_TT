import pymysql

host = "database-2.cpmuw44kwff5.eu-north-1.rds.amazonaws.com"
user = "admin"
password = "databasenew1234"
database = "foe_timetable_scheduler"

try:
    print("Connecting to AWS RDS...")
    connection = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        connect_timeout=10
    )
    cursor = connection.cursor()

    # Fix seeded Batch 24 (batch_id=2) students that have wrong EG/2023/500x numbers
    # Correct range: EG/2022/4904 to EG/2022/5453
    cursor.execute(
        "SELECT user_id FROM user_account WHERE batch_id=2 AND role='student' AND username LIKE 'student_2023_%' ORDER BY user_id"
    )
    rows = cursor.fetchall()
    print(f"Found {len(rows)} Batch 24 seeded students to fix...")

    start = 4904
    updated = 0
    for i, (uid,) in enumerate(rows):
        new_reg = "EG/2022/{:04d}".format(start + i)
        new_username = "student_2022_{}".format(start + i)
        cursor.execute(
            "UPDATE user_account SET student_id_number=%s, username=%s WHERE user_id=%s",
            (new_reg, new_username, uid)
        )
        updated += 1

    connection.commit()
    end_num = start + updated - 1
    print("Done! Updated {} accounts.".format(updated))
    print("Range now: EG/2022/{:04d} - EG/2022/{:04d}".format(start, end_num))

    # Verify a sample
    cursor.execute(
        "SELECT username, student_id_number FROM user_account WHERE batch_id=2 AND role='student' ORDER BY user_id LIMIT 5"
    )
    print("\nSample of updated records:")
    for r in cursor.fetchall():
        print("  ", r)

except Exception as e:
    print("Fatal Error: {}".format(e))
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
