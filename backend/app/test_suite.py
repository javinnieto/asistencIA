import json
import paho.mqtt.client as mqtt
import time
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from asistencias.models import Persona, Institucion, TipoPersona, Curso, PersonaInstitucion, Horario, Asistencia, EstadoAsistencia
from django.utils import timezone
from datetime import datetime, time as time_obj, date

client = mqtt.Client(protocol=mqtt.MQTTv311)
client.connect("mosquitto", 1883, 60)

def send_mqtt(person_id, name, time_str):
    payload = {
        "operator": "RecPush",
        "info": {
            "personId": str(person_id),
            "persionName": name,
            "temperature": "36.2",
            "VerifyStatus": 1,
            "time": time_str,
            "pic": ""
        }
    }
    client.publish("mqtt/face/1379241/rec/AttendanceRecord", json.dumps(payload))
    print(f"Sent MQTT check-in for {person_id}: {name} at {time_str}")

# Set up test data
inst = Institucion.objects.first()
tip = TipoPersona.objects.first()

print("Borrando personas y cursos de prueba...")
Persona.objects.filter(idPersona__in=[1111, 2222, 3333]).delete()
Curso.objects.filter(nombre__in=['Curso Fuera Horario', 'Curso En Horario']).delete()

print("Creando curso fuera de horario y asignándole a 2222...")
curso2 = Curso.objects.create(nombre='Curso Fuera Horario', institucion=inst, activo=True)
Horario.objects.create(curso=curso2, dia='Domingo', hora_inicio=time_obj(8, 0), hora_fin=time_obj(12, 0), activo=True)
p2 = Persona.objects.create(idPersona=2222, nombre="Test FueraHorario", requiere_salida=False)
PersonaInstitucion.objects.create(persona=p2, institucion=inst, tipo=tip, curso=curso2)

print("Creando curso en horario y asignándole a 3333...")
curso3 = Curso.objects.create(nombre='Curso En Horario', institucion=inst, activo=True)
Horario.objects.create(curso=curso3, dia='Domingo', hora_inicio=time_obj(10, 0), hora_fin=time_obj(14, 0), activo=True)
p3 = Persona.objects.create(idPersona=3333, nombre="Test EnHorario", requiere_salida=False)
PersonaInstitucion.objects.create(persona=p3, institucion=inst, tipo=tip, curso=curso3)

# Emit messages
print("Wait... emitting messages")
send_mqtt(1111, "Test Nuevo", "2026-02-22 11:00:00") # No tiene nada, deberia ser Sin curso asignado
time.sleep(1)
send_mqtt(2222, "Test FueraHorario", "2026-02-22 15:00:00") # Deberia ser fuera de horario
time.sleep(1)
send_mqtt(3333, "Test EnHorario", "2026-02-22 11:30:00") # Deberia ser curso presente en horario

client.loop()
client.disconnect()
print("Terminado.")
