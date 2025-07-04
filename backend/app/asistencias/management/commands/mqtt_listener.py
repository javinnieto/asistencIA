from django.core.management.base import BaseCommand
import paho.mqtt.client as mqtt
import json
from asistencias.models import Asistencia, Persona, EstadoAsistencia
from django.utils import timezone

BROKER = 'mosquitto'  # Nombre del servicio Docker o IP
PORT = 1883
TOPIC = 'mqtt/face/1379241/Rec'  # Topic real para personas conocidas

class Command(BaseCommand):
    help = 'Escucha mensajes MQTT y guarda asistencias en la base de datos.'

    def handle(self, *args, **options):
        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                self.stdout.write(self.style.SUCCESS('Conectado al broker MQTT'))
                client.subscribe(TOPIC, qos=1)
                self.stdout.write(self.style.SUCCESS(f'Suscripto al topic: {TOPIC}'))
            else:
                self.stdout.write(self.style.ERROR(f'Error de conexión: {rc}'))

        def on_message(client, userdata, msg):
            try:
                payload = msg.payload.decode('utf-8')
                data = json.loads(payload)
                operator = data.get('operator')
                info = data.get('info', {})
                if operator != 'RecPush':
                    self.stdout.write(self.style.WARNING(f'Mensaje ignorado (operator={operator})'))
                    return
                # Extraer datos relevantes
                person_id = int(info.get('personId'))
                nombre = info.get('persionName', '')
                temperatura = float(info.get('temperature', 0))
                fecha_hora = info.get('time', timezone.now())
                estado_nombre = 'Presente'  # O ajustar según lógica
                # Buscar o crear persona y actualizar cantRegistros
                persona, created = Persona.objects.get_or_create(
                    idPersona=person_id,
                    defaults={
                        'nombre': nombre,
                        'cantRegistros': 1
                    }
                )
                if not created:
                    persona.cantRegistros += 1
                    persona.save()
                estado, _ = EstadoAsistencia.objects.get_or_create(nombre=estado_nombre)
                Asistencia.objects.create(
                    persona=persona,
                    fechaHora=fecha_hora,
                    temperatura=temperatura,
                    estado=estado
                )
                self.stdout.write(self.style.SUCCESS(f'Asistencia registrada para persona {person_id}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error procesando mensaje: {e}'))

        client = mqtt.Client()
        client.on_connect = on_connect
        client.on_message = on_message
        self.stdout.write(f'Conectando a {BROKER}:{PORT}...')
        client.connect(BROKER, PORT, 60)
        client.loop_forever() 