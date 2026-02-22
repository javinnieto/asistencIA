import json
import paho.mqtt.client as mqtt
import time

def send_mqtt(person_id, name):
    client = mqtt.Client(protocol=mqtt.MQTTv311)
    client.connect("mosquitto", 1883, 60)
    
    payload = {
        "operator": "RecPush",
        "info": {
            "personId": str(person_id),
            "persionName": name,
            "temperature": "36.2",
            "VerifyStatus": 1,
            "pic": ""
        }
    }
    client.publish("mqtt/face/1379241/rec/AttendanceRecord", json.dumps(payload))
    client.loop()
    client.disconnect()
    print(f"Sent MQTT check-in for {person_id}: {name}")

if __name__ == "__main__":
    send_mqtt(888, "Estudiante Prueba 2")
