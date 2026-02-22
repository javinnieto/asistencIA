import json
import paho.mqtt.client as mqtt
from django.core.management.base import BaseCommand
import time

class Command(BaseCommand):
    def handle(self, *args, **options):
        client = mqtt.Client(protocol=mqtt.MQTTv311)
        client.connect("mosquitto", 1883, 60)
        
        payload = {
            "operator": "RecPush",
            "info": {
                "personId": "999",
                "persionName": "Estudiante Nuevo 999",
                "temperature": "36.5",
                "VerifyStatus": 1,
                "pic": ""
            }
        }
        
        self.stdout.write("Publishing MQTT message for new ID 999...")
        client.publish("mqtt/face/1379241/rec/AttendanceRecord", json.dumps(payload))
        client.loop()
        client.disconnect()
        self.stdout.write(self.style.SUCCESS("Message sent!"))
