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

    # 1. Remove user account for tharusha@ug.ruh.ac.lk
    cursor.execute("""
        DELETE FROM user_account 
        WHERE user_id = 439 OR university_email = 'tharusha@ug.ruh.ac.lk' OR username = 'tharusha@ug.ruh.ac.lk'
    """)
    print("Successfully deleted account tharusha@ug.ruh.ac.lk from user_account.")

    # 2. Batch configurations: (regYear, startBase, endBase, batchNum)
    BATCH_CONFIGS = {
        1: (2025, 6560, 7112, 27), # 27th Batch (Semester 2)
        2: (2022, 4904, 5453, 24), # 24th Batch (Semester 6)
        3: (2021, 4376, 4894, 23), # 23rd Batch (Semester 8)
        4: (2023, 5456, 5998, 25), # 25th Batch (Semester 4)
        5: (2024, 6000, 6550, 26), # 26th Batch (Semester 3)
    }

    # Exact Technical Elective (TE) and specialized module student counts from official faculty timetable
    EXACT_TE_COUNTS = {
        'EE6208': 8,   # Introduction to Biomedical Engineering (TE)
        'ME6210': 20,  # Industrial Automation (TE)
        'CE6253': 17,  # Sustainable Built Environment Principles (TE)
        'CE6252': 118, # Dynamic and Control of Structures (TE)
        'EE6305': 15,  # Artificial Intelligence (TE)
        'EE6309': 52,  # Renewable Energy Systems (TE)
        'EE6206': 49,  # Energy Economics (TE)
        'EE6207': 20,  # Information Security (TE)
        'EE6210': 16,  # Wireless and Mobile Communications (TE)
        'EE6211': 16,  # Wireless and Mobile Communications (TE)
        'ME6211': 16,  # Naval Architecture and Hull Design (TE)
        'ME6214': 2,   # Naval Architecture (C-18)
        'ME4210': 17,  # Analog and Digital Electronics (TE)
        'ME4211': 79,  # Automobile Engineering (TE)
        'ME4212': 24,  # Nanotechnology (TE)
        'MN4210': 62,  # Analog and Digital Electronics (TE)
        'IS4225': 13,  # Innovation Management & Entrepreneurship
        'IS4128': 88,  # Industrial Sociology
        'IS4129': 2,   # History of Engineering in Sri Lanka
        'IS4224': 121, # Finance Management
        'ME8211': 69,  # Energy Management (TE)
        'ME8212': 33,  # Non Destructive Testing (TE)
        'EE8203': 14,  # Design and Management of Data Networks (TE)
        'EE8204': 18,  # Digital Communication (TE)
        'EE8206': 42,  # Electrical Installations II (TE)
        'EE8210': 25,  # Intelligent Systems Design (TE)
        'EE8211': 14,  # Microwave Communication (TE)
        'EE8217': 2,   # Software Architecture (TE)
        'EC8205': 13,  # Design and Management of Data Networks (TE)
        'EC8207': 20,  # Integrated Circuit Design (TE)
        'EC8208': 116, # Software Architecture (TE)
    }

    # 3. Update all exam timetables and populate exact student_id_range for every exam_entry
    cursor.execute("SELECT exam_timetable_id, batch_id FROM exam_timetable")
    tts = cursor.fetchall()
    print(f"Found {len(tts)} exam timetables to check and update...")

    total_updated = 0
    for tt_id, batch_id in tts:
        cfg = BATCH_CONFIGS.get(batch_id, (2025, 6560, 7112, 27))
        regYear, startBase, endBase, batchNum = cfg
        
        cursor.execute("""
            SELECT e.exam_entry_id, e.module_id, e.allocated_count, m.module_code, d.department_code
            FROM exam_entry e
            LEFT JOIN module m ON e.module_id = m.module_id
            LEFT JOIN department d ON m.department_id = d.department_id
            WHERE e.exam_timetable_id = %s
            ORDER BY e.exam_date ASC, e.start_time ASC, e.exam_entry_id ASC
        """, (tt_id,))
        entries = cursor.fetchall()
        
        module_offsets = {}
        for entry_id, mod_id, count, mod_code, dept_code in entries:
            code_clean = (mod_code or "").strip().upper()
            if code_clean in EXACT_TE_COUNTS:
                alloc = EXACT_TE_COUNTS[code_clean]
            else:
                alloc = count if (count and count > 0) else 100

            mod_key = mod_id if mod_id else 0
            current_idx = module_offsets.get(mod_key, 0)
            
            start_num = startBase + current_idx
            end_num = min(startBase + current_idx + alloc - 1, endBase)
            if start_num > endBase:
                start_num = endBase
                
            prefix_str = f"{dept_code}: " if (dept_code and dept_code.upper() != 'IS' and dept_code.upper() != 'ALL') else ""
            range_str = f"{prefix_str}EG/{regYear}/{start_num:04d} - EG/{regYear}/{end_num:04d}"
            
            cursor.execute("""
                UPDATE exam_entry
                SET student_id_range = %s, allocated_count = %s
                WHERE exam_entry_id = %s
            """, (range_str, alloc, entry_id))
            
            module_offsets[mod_key] = current_idx + alloc
            total_updated += 1

    connection.commit()
    print(f"Successfully updated {total_updated} exam entry registration ranges across all timetables!")

    # 4. Verification sample
    cursor.execute("""
        SELECT et.exam_timetable_id, b.batch_name, m.module_code, h.hall_name, e.student_id_range, e.allocated_count
        FROM exam_entry e
        JOIN exam_timetable et ON e.exam_timetable_id = et.exam_timetable_id
        JOIN batch b ON et.batch_id = b.batch_id
        JOIN module m ON e.module_id = m.module_id
        LEFT JOIN hall h ON e.hall_id = h.hall_id
        WHERE b.batch_name IN ('27th', '24th', '25th', '23rd')
        ORDER BY et.exam_timetable_id DESC, e.exam_entry_id ASC
        LIMIT 20
    """)
    print("\nVERIFIED UPDATED EXAM ENTRIES SAMPLE:")
    for r in cursor.fetchall():
        print("  ", r)

except Exception as e:
    print(f"Fatal Error: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()

