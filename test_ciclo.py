import requests
import json

URL_TOKEN = 'http://localhost:8001/api/token/'
URL_AVANZAR = 'http://localhost:8001/api/sistema/avanzar-anio/'
URL_REVERTIR = 'http://localhost:8001/api/sistema/revertir-anio/'

res = requests.post(URL_TOKEN, json={'username':'javinnieto', 'password':'javinnieto'})
token = res.json()['access']
headers = {'Authorization': f'Bearer {token}'}

print("Avanzando año...")
res_avanzar = requests.post(URL_AVANZAR, headers=headers)
print(res_avanzar.status_code, res_avanzar.json())

print("Revirtiendo año...")
res_revertir = requests.post(URL_REVERTIR, headers=headers)
print(res_revertir.status_code, res_revertir.json())

