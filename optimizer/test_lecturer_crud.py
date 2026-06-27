import urllib.request
import json
import random

def request(url, data=None, method="GET"):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        
    try:
        with urllib.request.urlopen(req, data=body) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error requesting {url}: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error body:", e.read().decode('utf-8'))
            except:
                pass
        raise e

# 1. Fetch departments
departments = request("http://localhost:8080/api/departments")
dept_id = departments[0]['departmentId']
other_dept_id = departments[1]['departmentId']

# 2. Create Lecturer
username = f"lec_crud_{random.randint(1000, 9999)}"
password = "password123"
name = "Dr. CRUD Lecturer"
email = f"{username}@university.edu"
specialization = "Database Systems"
university_address = "Building A, Room 101"
phone_number = "+94 77 999 8888"

print(f"Creating lecturer '{username}'...")
payload = {
    "username": username,
    "password": password,
    "role": "lecturer",
    "name": name,
    "email": email,
    "departmentId": dept_id,
    "specialization": specialization,
    "maxHoursPerWeek": 20,
    "universityAddress": university_address,
    "phoneNumber": phone_number
}

created_user = request("http://localhost:8080/api/users", data=payload, method="POST")
print("User created successfully. ID:", created_user['userId'])

# 3. Retrieve and find lecturer
lecturers = request("http://localhost:8080/api/lecturers")
matching = [l for l in lecturers if l['name'] == name]
assert len(matching) > 0, "Created lecturer not found!"
lec = matching[0]
lec_id = lec['lecturerId']
print(f"Found lecturer in list with ID: {lec_id}")

# 4. Update Lecturer via PUT /api/lecturers/{id}
print(f"Updating lecturer ID {lec_id}...")
update_payload = {
    "name": "Dr. Updated Lecturer",
    "email": "updated_email@university.edu",
    "maxHoursPerWeek": 25,
    "specialization": "Distributed Systems",
    "universityAddress": "Building B, Room 202",
    "phoneNumber": "+94 77 000 0000",
    "department": {"departmentId": other_dept_id}
}

updated_res = request(f"http://localhost:8080/api/lecturers/{lec_id}", data=update_payload, method="PUT")
print("Update response:", updated_res)

# 5. Fetch all users to verify username/UserAccount remains active
users = request("http://localhost:8080/api/users")
matching_users = [u for u in users if u['username'] == username]
assert len(matching_users) > 0, "UserAccount should still exist!"
print("UserAccount still exists and is linked.")

# 6. Delete Lecturer via DELETE /api/lecturers/{id}
print(f"Deleting lecturer ID {lec_id}...")
delete_res = request(f"http://localhost:8080/api/lecturers/{lec_id}", method="DELETE")
print("Delete response:", delete_res)

# 7. Verify both Lecturer and UserAccount are deleted (cascade check)
lecturers_post = request("http://localhost:8080/api/lecturers")
assert not any(l['lecturerId'] == lec_id for l in lecturers_post), "Lecturer profile should be deleted!"
print("Verified Lecturer profile was deleted.")

users_post = request("http://localhost:8080/api/users")
assert not any(u['username'] == username for u in users_post), "UserAccount should be deleted via cascade!"
print("Verified UserAccount was deleted via cascade.")

print("\n--- ALL LECTURER CRUD & CASCADE TESTS PASSED! ---")
