from django.core.management.base import BaseCommand
import paho.mqtt.client as mqtt
import json
import logging
import time
import ntplib
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
            if operator == 'RecPush':
                # Procesar asistencia
                self.procesar_asistencia(info, client, msg.topic)
            else:
                self.stdout.write(self.style.WARNING(f'⚠️ Mensaje ignorado (operator={operator})'))
                logger.warning(f'Mensaje ignorado - operador incorrecto/no manejado: {operator}')
                return
            
        except json.JSONDecodeError as e:
            error_msg = f'❌ Error parseando JSON: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Payload: {msg.payload}')
        except Exception as e:
            error_msg = f'❌ Error procesando mensaje: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Payload: {msg.payload}')



    def procesar_asistencia(self, info, client=None, topic=None):
        """Procesa una asistencia recibida por MQTT con lógica flexible"""
        try:
            with transaction.atomic():
                # ═══════════════════════════════════════════════
                # 1. EXTRAER DATOS DEL PAYLOAD
                # ═══════════════════════════════════════════════
                person_id = int(info.get('personId'))
                # El dispositivo real envía 'persionName' (no 'Persistname' como dice el PDF)
                nombre = info.get('persionName', info.get('Persistname', info.get('Name', 'Usuario Desconocido')))
                if nombre:
                    nombre = nombre.strip()
                temperatura = float(info.get('temperature', 0.0))
                verify_status = str(info.get('VerifyStatus', '0'))
                foto_base64 = info.get('pic', None)
                
                self.stdout.write(f'🔍 Procesando: ID={person_id}, Nombre={nombre}, Temp={temperatura}, Status={verify_status}, Foto={"Sí" if foto_base64 else "No"}')
                
                # Solo procesar personas reconocidas (VerifyStatus == 1)
                if verify_status != LECTOR_CONFIG['VERIFY_STATUS_SUCCESS']:
                    self.stdout.write(self.style.WARNING(f'⚠️ Persona no reconocida (ID: {person_id}) - VerifyStatus: {verify_status}'))
                    return

                # ═══════════════════════════════════════════════
                # 2. OBTENER FECHA/HORA
                # ═══════════════════════════════════════════════
                def get_ntp_time():
                    try:
                        ntp_client = ntplib.NTPClient()
                        response = ntp_client.request('ntp.ign.gob.ar', version=3, timeout=5)
                        dt = datetime.fromtimestamp(response.tx_time, tz=timezone.utc)
                        return timezone.localtime(dt)
                    except Exception as e:
                        logger.error(f'Error obteniendo hora NTP: {e}')
                        return timezone.now()

                time_str = info.get('time')
                if time_str:
                    try:
                        fecha_hora = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
                        fecha_hora = timezone.make_aware(fecha_hora)
                    except Exception:
                        fecha_hora = get_ntp_time()
                else:
                    fecha_hora = get_ntp_time()

                # ═══════════════════════════════════════════════
                # 3. BUSCAR O CREAR PERSONA
                # ═══════════════════════════════════════════════
                from asistencias.models import PersonaInstitucion, Horario, Institucion, ConflictoIdentidad
                
                # Check if it exists
                persona = Persona.objects.filter(idPersona=person_id).first()
                creada = False
                
                if not persona:
                    persona = Persona.objects.create(
                        idPersona=person_id,
                        nombre=nombre or f'Persona {person_id}',
                        activo=True
                    )
                    
                    if foto_base64 and foto_base64.strip():
                        persona.foto = foto_base64
                        persona.save(update_fields=['foto'])
                        self.stdout.write(f'📸 Foto inicial guardada para la nueva persona {persona.nombre}')
                        
                    self.stdout.write(self.style.SUCCESS(f'🆕 Nueva persona creada: {persona.nombre} (ID: {person_id})'))
                else:
                    self.stdout.write(f'👤 Persona encontrada: {persona.nombre} (ID: {person_id})')
                    
                    # VERIFICACIÓN CRUZADA DE IDENTIDAD
                    def is_similar(n1, n2):
                        if not n1 or not n2: return True
                        if n1.startswith('Persona ') or n2.startswith('Persona '): return True
                        words1 = set(n1.lower().split())
                        words2 = set(n2.lower().split())
                        return len(words1.intersection(words2)) > 0
                    
                    if not is_similar(persona.nombre, nombre):
                        self.stdout.write(self.style.ERROR(f'🚨 ALERTA: Conflicto de Identidad! Lector dice "{nombre}" pero en DB es "{persona.nombre}" para el ID {person_id}'))
                        ConflictoIdentidad.objects.create(
                            persona_db=persona,
                            nombre_recibido=nombre,
                            foto_recibida=foto_base64
                        )
                        logger.error(f'Conflicto de identidad detectado y guardado. ID: {person_id}, DB: {persona.nombre}, Recibido: {nombre}')
                        return  # ABORTAMOS: No guardamos nada más

                # ═══════════════════════════════════════════════
                # 4. BUSCAR HORARIO VÁLIDO
                # ═══════════════════════════════════════════════
                dias_map = {
                    0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves', 
                    4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
                }
                dia_actual = dias_map[fecha_hora.weekday()]

                # Buscar cursos activos de la persona
                cursos_ids = PersonaInstitucion.objects.filter(
                    persona=persona, 
                    activo=True,
                    curso__isnull=False,
                    curso__activo=True
                ).values_list('curso_id', flat=True)

                # Buscar roles activos de la persona
                roles_ids = PersonaInstitucion.objects.filter(
                    persona=persona,
                    activo=True
                ).values_list('idPersonaInstitucion', flat=True)

                # Buscar horarios candidatos para hoy
                from django.db.models import Q
                horarios_candidatos = Horario.objects.filter(
                    Q(curso_id__in=cursos_ids) | Q(persona_institucion_id__in=roles_ids),
                    dia=dia_actual,
                    activo=True
                )
                
                horario_valido = None
                minutos_tarde = 0
                minutos_temprano = 0
                estado_nombre = None

                for h in horarios_candidatos:
                    # Rango válido: [Inicio - 1 hora, Fin]
                    start_dt = datetime.combine(fecha_hora.date(), h.hora_inicio)
                    start_dt_aware = timezone.make_aware(start_dt)
                    
                    end_dt = datetime.combine(fecha_hora.date(), h.hora_fin)
                    end_dt_aware = timezone.make_aware(end_dt)
                    
                    valid_start = start_dt_aware - timedelta(hours=1)
                    valid_end = end_dt_aware

                    if valid_start <= fecha_hora <= valid_end:
                        horario_valido = h
                        
                        # Calcular tardanza (tolerancia de 1 minuto)
                        if fecha_hora > start_dt_aware:
                            diff = fecha_hora - start_dt_aware
                            minutos_tarde = int(diff.total_seconds() / 60)
                            
                            if minutos_tarde >= 1:
                                estado_nombre = ESTADOS_ASISTENCIA['TARDANZA']
                            else:
                                minutos_tarde = 0
                                estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                        else:
                            minutos_tarde = 0
                            estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                        
                        break

                # Si no hay horario válido → Fuera de Horario
                if not horario_valido:
                    estado_nombre = ESTADOS_ASISTENCIA['FUERA_DE_HORARIO']
                    self.stdout.write(f'🕐 Sin horario válido para {persona.nombre} a las {fecha_hora.time()} → Fuera de Horario')

                # ═══════════════════════════════════════════════
                # 5. CONTROL DE DUPLICADOS Y SALIDAS
                # ═══════════════════════════════════════════════
                inicio_dia = fecha_hora.replace(hour=0, minute=0, second=0, microsecond=0)
                fin_dia = inicio_dia + timedelta(days=1)
                
                tipo_asistencia = 'Entrada'
                
                if horario_valido:
                    entradas_hoy = Asistencia.objects.filter(
                        persona=persona, 
                        horario=horario_valido,
                        tipo='Entrada',
                        fechaHora__gte=inicio_dia,
                        fechaHora__lt=fin_dia
                    )

                    if entradas_hoy.exists():
                        if not persona.requiere_salida:
                            self.stdout.write(self.style.WARNING(f'⚠️ Asistencia DUPLICADA (Entrada) para {persona.nombre} en horario {horario_valido}. Ignorada.'))
                            return
                        else:
                            salidas_hoy = Asistencia.objects.filter(
                                persona=persona, 
                                horario=horario_valido,
                                tipo='Salida',
                                fechaHora__gte=inicio_dia,
                                fechaHora__lt=fin_dia
                            )
                            if salidas_hoy.exists():
                                self.stdout.write(self.style.WARNING(f'⚠️ Asistencia DUPLICADA (Salida) para {persona.nombre} en horario {horario_valido}. Ignorada.'))
                                return
                            
                            tipo_asistencia = 'Salida'
                            minutos_tarde = 0 # No hay tardanza de entrada en una salida
                            end_dt = datetime.combine(fecha_hora.date(), horario_valido.hora_fin)
                            end_dt_aware = timezone.make_aware(end_dt)
                            limite_temprano = end_dt_aware - timedelta(minutes=5)
                            limite_tarde = end_dt_aware + timedelta(hours=3)
                            
                            if fecha_hora < limite_temprano:
                                estado_nombre = ESTADOS_ASISTENCIA['SE_FUE_ANTES']
                                diff_temprano = end_dt_aware - fecha_hora
                                minutos_temprano = int(diff_temprano.total_seconds() / 60)
                            elif fecha_hora <= limite_tarde:
                                estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                            else:
                                estado_nombre = ESTADOS_ASISTENCIA['FUERA_DE_HORARIO']
                else:
                    # SIN HORARIO (Fuera de Horario): cooldown de 15 minutos
                    limite_cooldown = fecha_hora - timedelta(minutes=15)
                    
                    reciente = Asistencia.objects.filter(
                        persona=persona,
                        fechaHora__gte=limite_cooldown,
                        fechaHora__lte=fecha_hora
                    ).exists()

                    if reciente:
                        self.stdout.write(self.style.WARNING(f'⚠️ Asistencia reciente (< 15 min) para {persona.nombre}. Ignorada (cooldown).'))
                        return

                # ═══════════════════════════════════════════════
                # 6. GUARDAR ASISTENCIA
                # ═══════════════════════════════════════════════
                estado_obj, _ = EstadoAsistencia.objects.get_or_create(nombre=estado_nombre)
                
                # Determinar institución
                institucion = None
                if horario_valido:
                    if horario_valido.curso:
                        institucion = horario_valido.curso.institucion
                    elif horario_valido.persona_institucion:
                        institucion = horario_valido.persona_institucion.institucion
                else:
                    # Si no hay horario, intentar obtener la institución del primer rol activo
                    rol = PersonaInstitucion.objects.filter(persona=persona, activo=True).first()
                    if rol:
                        institucion = rol.institucion
                
                asistencia = Asistencia.objects.create(
                    persona=persona,
                    fechaHora=fecha_hora,
                    temperatura=temperatura,
                    estado=estado_obj,
                    horario=horario_valido,  # None si es fuera de horario
                    llegada_tarde_minutos=minutos_tarde,
                    salida_temprano_minutos=minutos_temprano,
                    institucion=institucion,
                    tipo=tipo_asistencia,
                    foto=foto_base64 if foto_base64 and foto_base64.strip() else None
                )
                
                # Log del resultado
                if horario_valido:
                    tarde_msg = f" (Tarde {minutos_tarde} min)" if minutos_tarde > 0 and tipo_asistencia == 'Entrada' else ""
                    if horario_valido.curso:
                        ctx_nombre = horario_valido.curso.nombre
                    else:
                        ctx_nombre = f"Rol {horario_valido.persona_institucion.tipo.nombre}"
                    log_msg = f'✅ Asistencia GUARDADA ({tipo_asistencia}): {persona.nombre} - {ctx_nombre}{tarde_msg} [{estado_nombre}]'
                else:
                    log_msg = f'✅ Asistencia GUARDADA ({tipo_asistencia}): {persona.nombre} - FUERA DE HORARIO ({fecha_hora.strftime("%H:%M")})'
                
                self.stdout.write(self.style.SUCCESS(log_msg))
                logger.info(log_msg)

        except Exception as e:
            error_msg = f'❌ Error procesando asistencia: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Info: {info}') 