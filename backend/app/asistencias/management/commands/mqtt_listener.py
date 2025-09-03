from django.core.management.base import BaseCommand
import paho.mqtt.client as mqtt
import json
import logging
import time
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from asistencias.models import Asistencia, Persona, EstadoAsistencia
from asistencias.constants import LECTOR_CONFIG, ESTADOS_ASISTENCIA, INSTITUCIONES

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración MQTT - USANDO SETTINGS DE DJANGO
BROKER = settings.MQTT_BROKER
PORT = settings.MQTT_PORT
TOPIC = 'mqtt/face/1379241/#'  # Comodín para recibir todos los subtopics
KEEPALIVE = 60

class Command(BaseCommand):
    help = 'Escucha mensajes MQTT y guarda asistencias en la base de datos.'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--daemon',
            action='store_true',
            help='Ejecutar en modo daemon (background)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando listener MQTT...'))
        
        # Configurar cliente MQTT
        client = mqtt.Client(
            client_id=f"django_mqtt_listener_{timezone.now().timestamp()}",
            clean_session=True
        )
        
        # Configurar autenticación si está disponible
        if settings.MQTT_USER and settings.MQTT_PASSWORD:
            client.username_pw_set(settings.MQTT_USER, settings.MQTT_PASSWORD)
            self.stdout.write(f'🔐 Autenticación MQTT configurada para usuario: {settings.MQTT_USER}')
        
        # Callbacks
        client.on_connect = self.on_connect
        client.on_message = self.on_message
        client.on_disconnect = self.on_disconnect
        client.on_log = self.on_log
        
        try:
            # Conectar al broker
            self.stdout.write(f'Conectando a {BROKER}:{PORT}...')
            client.connect(BROKER, PORT, KEEPALIVE)
            
            # Loop principal
            if options['daemon']:
                client.loop_start()
                self.stdout.write(self.style.SUCCESS('Listener MQTT iniciado en modo daemon'))
                # Mantener vivo el comando
                try:
                    while True:
                        time.sleep(1)
                except KeyboardInterrupt:
                    self.stdout.write(self.style.WARNING('Deteniendo listener...'))
                    client.loop_stop()
                    client.disconnect()
            else:
                client.loop_forever()
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error fatal: {e}'))
            logger.error(f'Error fatal en MQTT listener: {e}')
            client.disconnect()
            raise

    def on_connect(self, client, userdata, flags, rc):
        """Callback cuando se conecta al broker"""
        if rc == 0:
            self.stdout.write(self.style.SUCCESS('✅ Conectado al broker MQTT'))
            client.subscribe(TOPIC, qos=1)
            self.stdout.write(self.style.SUCCESS(f'📡 Suscripto al topic: {TOPIC}'))
            logger.info(f'Conectado al broker MQTT y suscripto a {TOPIC}')
        else:
            error_msg = f'❌ Error de conexión MQTT: {rc}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(error_msg)

    def on_disconnect(self, client, userdata, rc):
        """Callback cuando se desconecta del broker"""
        if rc != 0:
            self.stdout.write(self.style.WARNING(f'⚠️ Desconexión inesperada: {rc}'))
            logger.warning(f'Desconexión MQTT inesperada: {rc}')
        else:
            self.stdout.write(self.style.SUCCESS('🔌 Desconectado del broker MQTT'))
            logger.info('Desconectado del broker MQTT')

    def on_log(self, client, userdata, level, buf):
        """Callback para logs del cliente MQTT"""
        logger.debug(f'MQTT Log: {buf}')

    def on_message(self, client, userdata, msg):
        """Callback cuando llega un mensaje MQTT"""
        try:
            # Decodificar mensaje
            payload = msg.payload.decode('utf-8')
            self.stdout.write(f'📨 Mensaje recibido: {payload[:100]}...')
            logger.info(f'Mensaje MQTT recibido: {payload}')
            
            # Parsear JSON
            data = json.loads(payload)
            operator = data.get('operator')
            info = data.get('info', {})
            
            # Validar operador
            if operator != 'RecPush':
                self.stdout.write(self.style.WARNING(f'⚠️ Mensaje ignorado (operator={operator})'))
                logger.warning(f'Mensaje ignorado - operador incorrecto: {operator}')
                return
            
            # Procesar asistencia
            self.procesar_asistencia(info)
            
        except json.JSONDecodeError as e:
            error_msg = f'❌ Error parseando JSON: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Payload: {msg.payload}')
        except Exception as e:
            error_msg = f'❌ Error procesando mensaje: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Payload: {msg.payload}')

    def procesar_asistencia(self, info):
        """Procesa una asistencia recibida por MQTT"""
        try:
            with transaction.atomic():
                # Extraer datos del payload real
                person_id = int(info.get('personId'))
                nombre = info.get('persionName', 'Usuario Desconocido').strip()
                temperatura = float(info.get('temperature', 0.0))
                verify_status = info.get('VerifyStatus', '0')
                person_type = info.get('PersonType', '0')
                
                # FILTRO CRUCIAL: Solo procesar personas reconocidas
                if verify_status != LECTOR_CONFIG['VERIFY_STATUS_SUCCESS']:
                    self.stdout.write(self.style.WARNING(f'⚠️ Persona no reconocida (ID: {person_id}) - VerifyStatus: {verify_status}'))
                    logger.warning(f'Persona no reconocida - ID: {person_id}, VerifyStatus: {verify_status}')
                    return
                
                # Parsear fecha/hora del formato real del lector
                time_str = info.get('time')
                if time_str:
                    try:
                        # Formato del lector: "2025-09-02 21:13:12"
                        fecha_hora = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
                        fecha_hora = timezone.make_aware(fecha_hora)
                    except:
                        fecha_hora = timezone.now()
                else:
                    fecha_hora = timezone.now()
                
                # Verificar si la persona existe en nuestra BD
                try:
                    persona = Persona.objects.get(idPersona=person_id)
                    # Actualizar datos si es necesario
                    if persona.nombre != nombre:
                        persona.nombre = nombre
                        persona.save()
                    
                    # Persona ya existe, no necesitamos actualizar nada más
                    
                except Persona.DoesNotExist:
                    # PERSONA NO EXISTE EN NUESTRA BD - CREAR SIN CLASIFICAR
                    self.stdout.write(self.style.WARNING(f'⚠️ Persona nueva detectada (ID: {person_id}) - Creando en BD'))
                    
                    # Crear persona genérica sin clasificar
                    persona = Persona.objects.create(
                        idPersona=person_id,
                        nombre=nombre,
                        activo=True
                    )
                    
                    self.stdout.write(self.style.SUCCESS(f'✅ Nueva persona creada: {nombre} (ID: {person_id}) - NECESITA CLASIFICACIÓN MANUAL'))
                
                # Obtener estado de asistencia usando constantes
                estado, _ = EstadoAsistencia.objects.get_or_create(
                    nombre=ESTADOS_ASISTENCIA['PRESENTE'],
                    defaults={'descripcion': 'Asistencia registrada por terminal biométrico'}
                )
                
                # Crear asistencia minimalista
                asistencia = Asistencia.objects.create(
                    persona=persona,
                    fechaHora=fecha_hora,
                    temperatura=temperatura,
                    estado=estado
                )
                
                # Log de éxito con más información
                success_msg = f'✅ Asistencia registrada: {persona.nombre} (ID: {person_id}) - Temp: {temperatura}°C - Similarity: {info.get("similarity1", "N/A")}%'
                self.stdout.write(self.style.SUCCESS(success_msg))
                logger.info(f'Asistencia registrada exitosamente: {asistencia.idAsistencia} - Persona: {persona.nombre}')
                
        except Exception as e:
            error_msg = f'❌ Error procesando asistencia: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Info: {info}')
            # No hacer raise para que siga funcionando con otros mensajes 