import requests
import json

base_url = "http://localhost:8001/api"

# Login
login_data = {"username": "javinnieto", "password": "javinnieto"}
res = requests.post(f"{base_url}/token/", json=login_data)
if res.status_code != 200:
    print("Login failed:", res.text)
    exit(1)

token = res.json().get('access')
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Add Person
person_data = {
  "nombre": "Prueba",
  "apellido": "Sistema",
  "email": "prueba@sistema.com",
  "telefono": "123456789",
  "estado": "activo",
  "requiere_salida": False,
  "roles": [
    {
      "institucion": 1,
      "tipo": 1,
      "curso": 1,
      "horarios_personalizados": []
    }
  ]
}

print("Creating person...")
res = requests.post(f"{base_url}/personas/", headers=headers, json=person_data)
print("Create response:", res.status_code, res.text)

if res.status_code == 201:
    person_id = res.json().get('idPersona')
    
    # Edit person
    edit_data = {
        "nombre": "Prueba",
        "apellido": "Editada",
        "roles": [
            {
               "institucion": 1,
               "tipo": 2,
               "curso": 1,
               "horarios_personalizados": []
            }
        ]
    }
    
    print("Editing person...")
    res = requests.patch(f"{base_url}/personas/{person_id}/", headers=headers, json=edit_data)
    print("Edit response:", res.status_code, res.text)

