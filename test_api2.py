import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

base_url = "http://localhost:8001/api"
login_data = json.dumps({"username": "javinnieto", "password": "javinnieto"}).encode('utf-8')

req = urllib.request.Request(f"{base_url}/token/", data=login_data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, context=ctx) as f:
        res = json.loads(f.read().decode('utf-8'))
        token = res.get('access')
except Exception as e:
    print("Login failed:", e)
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

person_data = {
  "nombre": "Prueba",
  "apellido": "Sistema",
  "email": "prueba@sistema.com",
  "telefono": "123456789",
  "estado": "activo",
  "requiere_salida": False,
  "roles": [
    {
      "institucion": 2,
      "tipo": 1,
      "horarios_personalizados": []
    }
  ]
}

print("Creating person...")
req2 = urllib.request.Request(f"{base_url}/personas/", data=json.dumps(person_data).encode('utf-8'), headers=headers)
try:
    with urllib.request.urlopen(req2, context=ctx) as f:
        print("Create response:", f.status, f.read().decode('utf-8'))
        person_res = json.loads(f.read().decode('utf-8') or '{}')
        person_id = person_res.get('idPersona') if person_res else None # Note this is buggy but we just print status
except Exception as e:
    print("Create failed:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
    exit(1)
