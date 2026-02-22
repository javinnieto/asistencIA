
import requests
import json

BASE_URL = "http://localhost:8001/api"
# Assuming default credentials or a test token might be needed if auth is enforced globally.
# For this script we will try to use the public endpoints or assuming dev environment.
# If token is needed, we might need a login step.

def get_token():
    try:
        resp = requests.post(f"http://localhost:8001/api/token/", json={"username": "javinnieto", "password": "admin123"})
        if resp.status_code == 200:
            return resp.json().get('access')
        print(f"Failed to get token: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Error getting token: {e}")
    return None

def verify_backend():
    print("--- STARTING BACKEND VERIFICATION ---")
    token = get_token()
    headers = {}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    
    import random
    # 1. Create Person
    random_id = random.randint(10000, 99999)
    new_person = {
        "idPersona": random_id,
        "nombre": "Test Backend Delete",
        "activo": True
    }
    
    print(f"1. Creating person: {new_person['nombre']}")
    resp = requests.post(f"{BASE_URL}/personas/", json=new_person, headers=headers)
    if resp.status_code != 201:
        print(f"FAILED to create person. Status: {resp.status_code}, Response: {resp.text}")
        return
    
    person_data = resp.json()
    person_id = person_data['idPersona']
    print(f"SUCCESS: Created person with ID {person_id}")

    # 2. Verify deletion
    print(f"2. Deleting person ID {person_id}")
    del_resp = requests.delete(f"{BASE_URL}/personas/{person_id}/", headers=headers)
    
    if del_resp.status_code == 204:
        print("SUCCESS: Person deleted (204 No Content)")
    else:
        print(f"FAILED to delete person. Status: {del_resp.status_code}, Response: {del_resp.text}")

    # 3. Verify it's gone
    print(f"3. Verifying it's gone")
    get_resp = requests.get(f"{BASE_URL}/personas/{person_id}/", headers=headers)
    if get_resp.status_code == 404:
        print("SUCCESS: Person not found (404) as expected")
    else:
        print(f"FAILED: Person still exists or other error. Status: {get_resp.status_code}")

if __name__ == "__main__":
    verify_backend()
