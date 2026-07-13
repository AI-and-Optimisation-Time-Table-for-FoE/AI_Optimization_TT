import urllib.request
import json

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
        print(f"Error: {e}")
        if hasattr(e, 'read'):
            try:
                print("Error Response Body:", e.read().decode('utf-8'))
            except:
                pass
        raise e

# Let's try to update lecturer ID 1 (Prof. Nirosha Malkanthi)
# We simulate the exact payload structure sent by frontend
payload = {
    "name": "Prof. Nirosha Malkanthi Updated",
    "email": "nirosha.m@university.edu",
    "maxHoursPerWeek": 20,
    "specialization": "Building Planning and Cost Estimating",
    "universityAddress": None,
    "phoneNumber": "0771234567",
    "department": {"departmentId": 1}
}

try:
    print("Testing lecturer update...")
    res = request("http://localhost:8080/api/lecturers/1", data=payload, method="PUT")
    print("Success response:", res)
except Exception as e:
    print("Failed with error:", e)
