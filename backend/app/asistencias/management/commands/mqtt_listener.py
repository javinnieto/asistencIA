from django.core.management.base import BaseCommand
import paho.mqtt.client as mqtt
import json
import logging
import time
from datetime import datetime, timedelta
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
        """Procesa una asistencia recibida por MQTT con lógica estricta de horarios"""
        try:
            with transaction.atomic():
                # Extraer datos del payload
                person_id = int(info.get('personId'))
                # Corrección basada en PDF V1.24 (pag 58): campo correcto es "Persistname"
                # Se mantiene un fallback a "Name" y "persionName" por robustez
                nombre = info.get('Persistname', info.get('Name', info.get('persionName', 'Usuario Desconocido'))).strip()
                temperatura = float(info.get('temperature', 0.0))
                verify_status = info.get('VerifyStatus', '0')
                
                # 1. FILTRO: Solo procesar personas reconocidas
                if verify_status != LECTOR_CONFIG['VERIFY_STATUS_SUCCESS']:
                    self.stdout.write(self.style.WARNING(f'⚠️ Persona no reconocida (ID: {person_id}) - VerifyStatus: {verify_status}'))
                    return

                # 2. Obtener fecha/hora
                time_str = info.get('time')
                if time_str:
                    try:
                        fecha_hora = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
                        fecha_hora = timezone.make_aware(fecha_hora)
                    except:
                        fecha_hora = timezone.now()
                else:
                    fecha_hora = timezone.now()

                # 3. Buscar persona
                try:
                    persona = Persona.objects.get(idPersona=person_id)
                except Persona.DoesNotExist:
                    self.stdout.write(self.style.ERROR(f'❌ Persona no encontrada en BD (ID: {person_id}). Asistencia ignorada.'))
                    return

                # 4. LÓGICA DE HORARIOS
                # Determinar día de la semana
                dias_map = {
                    0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves', 
                    4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
                }
                dia_actual = dias_map[fecha_hora.weekday()]
                time_actual = fecha_hora.time()

                # Buscar horarios de la persona para hoy a través de sus cursos activos
                # Nuevo enfoque: Persona -> Roles Activos -> Cursos Activos -> Horarios del día
                from asistencias.models import PersonaInstitucion, Horario
                
                # Obtener cursos activos de la persona
                cursos_ids = PersonaInstitucion.objects.filter(
                    persona=persona, 
                    activo=True,
                    curso__isnull=False
                ).values_list('curso_id', flat=True)

                if not cursos_ids:
                    self.stdout.write(self.style.WARNING(f'⚠️ Persona {persona.nombre} no tiene cursos activos. Asistencia ignorada.'))
                    return

                # Buscar horarios en esos cursos para el día actual
                horarios_candidatos = Horario.objects.filter(
                    curso_id__in=cursos_ids,
                    dia=dia_actual,
                    activo=True
                )
                
                horario_valido = None
                minutos_tarde = 0
                estado_nombre = ESTADOS_ASISTENCIA['AUSENTE'] 

                for h in horarios_candidatos:
                    # Convertir tiempos a datetime para comparar
                    
                    # Rango válido: [Inicio - 1 hora, Fin]
                    start_dt = datetime.combine(fecha_hora.date(), h.hora_inicio)
                    start_dt_aware = timezone.make_aware(start_dt)
                    
                    end_dt = datetime.combine(fecha_hora.date(), h.hora_fin)
                    end_dt_aware = timezone.make_aware(end_dt)
                    
                    valid_start = start_dt_aware - timedelta(hours=1)
                    valid_end = end_dt_aware

                    if valid_start <= fecha_hora <= valid_end:
                        horario_valido = h
                        
                        # Calcular tardanza con tolerancia de 1 minuto
                        if fecha_hora > start_dt_aware:
                            diff = fecha_hora - start_dt_aware
                            minutos_tarde = int(diff.total_seconds() / 60)
                            
                            # Tolerancia de 1 minuto
                            if minutos_tarde >= 1:
                                estado_nombre = ESTADOS_ASISTENCIA['TARDANZA']
                            else:
                                minutos_tarde = 0
                                estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                        else:
                            minutos_tarde = 0
                            estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                        
                        break

                if not horario_valido:
                    self.stdout.write(self.style.WARNING(f'⚠️ Asistencia FUERA DE RANGO para {persona.nombre} a las {fecha_hora.time()}. Ignorada.'))
                    logger.warning(f'Asistencia fuera de rango: {persona.idPersona} - {fecha_hora}')
                    return

                # 5. CONTROL DE DUPLICADOS
                # Verificar si ya existe asistencia para esta persona en este horario hoy
                inicio_dia = fecha_hora.replace(hour=0, minute=0, second=0, microsecond=0)
                duplicada = Asistencia.objects.filter(
                    persona=persona, 
                    horario=horario_valido,
                    fechaHora__gte=inicio_dia,
                    fechaHora__lt=inicio_dia + timedelta(days=1)
                ).exists()

                if duplicada:
                    self.stdout.write(self.style.WARNING(f'⚠️ Asistencia DUPLICADA para {persona.nombre} en el horario {horario_valido}. Ignorada.'))
                    return

                # 6. GUARDAR ASISTENCIA
                estado_obj, _ = EstadoAsistencia.objects.get_or_create(nombre=estado_nombre)
                
                asistencia = Asistencia.objects.create(
                    persona=persona,
                    fechaHora=fecha_hora,
                    temperatura=temperatura,
                    estado=estado_obj,
                    horario=horario_valido,
                    llegada_tarde_minutos=minutos_tarde,
                    # Institución podría derivarse del curso/horario
                    institucion=horario_valido.curso.institucion
                )
                
                tarde_msg = f" (Tarde {minutos_tarde} min)" if minutos_tarde > 0 else " (A tiempo)"
                log_msg = f'✅ Asistencia GUARDADA: {persona.nombre} - {horario_valido.curso.nombre} {tarde_msg}'
                self.stdout.write(self.style.SUCCESS(log_msg))
                logger.info(log_msg)

        except Exception as e:
            error_msg = f'❌ Error procesando asistencia: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Info: {info}') 