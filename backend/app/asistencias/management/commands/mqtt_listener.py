from django.core.management.base import BaseCommand
import paho.mqtt.client as mqtt
import json
import logging
import time
import threading
import ntplib
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django import db
from django.conf import settings
from asistencias.models import Asistencia, Persona, EstadoAsistencia
from asistencias.constants import LECTOR_CONFIG, ESTADOS_ASISTENCIA, INSTITUCIONES

# Configuración de logging
logger = logging.getLogger('mqtt_listener')

# Configuración MQTT - USANDO SETTINGS DE DJANGO
BROKER = settings.MQTT_BROKER
PORT = settings.MQTT_PORT
DEVICE_ID = LECTOR_CONFIG['DEVICE_ID']
TOPIC_BROAD = 'mqtt/#'
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
        client_id = f"django_mqtt_listener_{timezone.now().timestamp()}"
        client = mqtt.Client(
            client_id=client_id,
            clean_session=True
        )
        self.stdout.write(f'🤖 Client ID: {client_id}')
        
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
            # Suscribirse a todo bajo mqtt/
            client.subscribe(TOPIC_BROAD, qos=1)
            self.stdout.write(self.style.SUCCESS(f'📡 Suscripto a {TOPIC_BROAD}'))
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
            self.stdout.write(f'📨 Msg en [{msg.topic}]: {payload[:200]}...')
            # Parsear JSON
            data = json.loads(payload)
            operator = data.get('operator')
            info = data.get('info', {})
            
            # Log inteligente: no mostrar la foto (pic) que es enorme
            log_data = json.loads(payload)
            if 'info' in log_data and 'pic' in log_data['info']:
                log_data['info']['pic'] = '...[FOTO]...'
            logger.info(f'Mensaje MQTT ({operator}): {json.dumps(log_data)}')
            
            # 1. Filtrar por ID de dispositivo (facesluiceId en Heartbeat/Offline/Online)
            device_msg_id = info.get('facesluiceId')
            message_id = data.get('messageId', '')
            
            # Ignorar comandos que nosotros mismos publicamos (el broker los rebota de vuelta)
            if isinstance(message_id, str) and (message_id.startswith('auto-sync-') or message_id.startswith('manual-sync-') or message_id.startswith('django_')):
                return
            
            # 2. Validar operador
            self.stdout.write(f'  → operator="{operator}" device_id="{device_msg_id}"')
            
            if operator == 'RecPush':
                # El evento de asistencia viene en el tópico específico del dispositivo
                if DEVICE_ID in msg.topic:
                    self.procesar_asistencia(info, client, msg.topic, message_id)
            
            elif operator == 'Online':
                if device_msg_id == DEVICE_ID:
                    self.stdout.write(self.style.SUCCESS(f'OK - EQUIPO ONLINE: {DEVICE_ID} detectado'))
                    
                    incoming_msg_id = data.get('messageId', int(time.time() % 100000))
                    ack_payload = {
                        "messageId": incoming_msg_id,
                        "operator": "Online-Ack",
                        "info": {
                            "facesluiceId": DEVICE_ID,
                            "result": "ok",
                            "detail": ""
                        }
                    }
                    client.publish(msg.topic, json.dumps(ack_payload))
                    self.stdout.write(f'📤 Online-Ack enviado a {msg.topic}')
            
            elif operator == 'Offline':
                if device_msg_id == DEVICE_ID:
                    self.stdout.write(self.style.WARNING(f'AVISO: El equipo {DEVICE_ID} se ha desconectado (Offline notice)'))
            
            elif operator == 'Online-Ack':
                # Ignorar nuestros propios acuses de recibo para evitar bucles o errores
                return
            
            else:
                # Otros mensajes (como Register, HeartBeat, etc.)
                if DEVICE_ID in msg.topic or device_msg_id == DEVICE_ID:
                    self.stdout.write(f'ℹ️ Mensaje de {DEVICE_ID}: {operator}')
                return
            
        except json.JSONDecodeError as e:
            error_msg = f'❌ Error parseando JSON: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Payload: {msg.payload}')
        except Exception as e:
            error_msg = f'❌ Error procesando mensaje: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Payload: {msg.payload}')

    def procesar_asistencia(self, info, client=None, topic=None, message_id=None):
        """Procesa una asistencia recibida por MQTT con lógica flexible"""
        try:
            # Asegurar que la conexión a la base de datos esté activa
            db.close_old_connections()
            
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
                        return timezone.localtime(timezone.now())

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
                    # Si no es alumno (Type 0), por defecto requiere marcar salida
                    person_type = info.get('PersonType', '1') # Por defecto tratamos como personal si no viene
                    must_mark_exit = person_type != LECTOR_CONFIG['PERSON_TYPE_ESTUDIANTE']
                    
                    persona = Persona.objects.create(
                        idPersona=person_id,
                        nombre=nombre or f'Persona {person_id}',
                        activo=True,
                        requiere_salida=must_mark_exit
                    )
                    
                    if foto_base64 and foto_base64.strip():
                        persona.foto = foto_base64
                        persona.save(update_fields=['foto'])
                        self.stdout.write(f'📸 Foto inicial guardada para la nueva persona {persona.nombre}')
                        
                    status_exit = "SI" if must_mark_exit else "NO"
                    self.stdout.write(self.style.SUCCESS(f'🆕 Nueva persona: {persona.nombre} (ID: {person_id}, Requiere Salida: {status_exit})'))
                else:
                    self.stdout.write(f'👤 Persona encontrada: {persona.nombre} (ID: {person_id})')
                    
                    # VERIFICACIÓN CRUZADA DE IDENTIDAD
                    import re
                    def is_similar(n1, n2):
                        if not n1 or not n2: return True
                        if n1.startswith('Persona ') or n2.startswith('Persona '): return True
                        
                        # Normalize names: lowercase and keep only words (alphanumeric)
                        # Replaces dots, emojis and other symbols with spaces or splits by them
                        words1 = set(re.findall(r'\w+', n1.lower()))
                        words2 = set(re.findall(r'\w+', n2.lower()))
                        
                        # If characters are not in latin letters, we might need a fallback.
                        # But \w covers most letters in various languages.
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
                    curso__activo=True,
                    curso__institucion__activa=True
                ).values_list('curso_id', flat=True)

                # Buscar roles activos de la persona
                roles_ids = PersonaInstitucion.objects.filter(
                    persona=persona,
                    activo=True,
                    institucion__activa=True
                ).values_list('idPersonaInstitucion', flat=True)

                # Buscar horarios candidatos para hoy
                from django.db.models import Q
                from asistencias.models import ConfiguracionSemana, DiaNoLaborable
                semana_actual = ConfiguracionSemana.get_semana_actual(fecha_hora.date())
                self.stdout.write(f'📅 Semana actual: {semana_actual}')
                
                horarios_crudos = Horario.objects.filter(
                    Q(curso_id__in=cursos_ids) | Q(persona_institucion_id__in=roles_ids),
                    Q(semana=semana_actual) | Q(semana='Todas'),
                    dia=dia_actual,
                    activo=True
                )
                
                # FILTRO DE FERIADOS / DIAS NO LABORABLES
                fecha_hoy = fecha_hora.date()
                feriados_hoy = DiaNoLaborable.objects.filter(
                    fecha_inicio__lte=fecha_hoy
                ).filter(
                    Q(fecha_fin__gte=fecha_hoy) | Q(fecha_fin__isnull=True)
                ).prefetch_related('cursos_afectados', 'tipos_persona_afectados', 'personas_afectadas')
                
                horarios_candidatos = []
                for h in horarios_crudos:
                    inscripcion = None
                    if h.curso:
                        institucion = h.curso.institucion
                        inscripcion = PersonaInstitucion.objects.filter(persona=persona, curso=h.curso, activo=True).first()
                        id_filtro_feriado = {'curso_id': h.curso.idCurso}
                    else:
                        institucion = h.persona_institucion.institucion
                        inscripcion = h.persona_institucion
                        id_filtro_feriado = None
                        
                    if not inscripcion:
                        continue
                        
                    es_feriado = False
                    for feriado in feriados_hoy:
                        if feriado.institucion_id != institucion.idInstitucion:
                            continue
                        
                        if feriado.aplica_a_todos:
                            es_feriado = True
                            break
                        if id_filtro_feriado and feriado.cursos_afectados.filter(**id_filtro_feriado).exists():
                            es_feriado = True
                            break
                        if feriado.tipos_persona_afectados.filter(idTipoPersona=inscripcion.tipo.idTipoPersona).exists():
                            es_feriado = True
                            break
                        if feriado.personas_afectadas.filter(idPersona=persona.idPersona).exists():
                            es_feriado = True
                            break
                            
                    if not es_feriado:
                        horarios_candidatos.append(h)
                
                # ═══════════════════════════════════════════════
                # 4 & 5. EVALUACIÓN Y MATCH MÚLTIPLE (Soporta transiciones entre clases)
                # ═══════════════════════════════════════════════
                # COOLDOWN GLOBAL DE 15 MINUTOS PARA EVITAR DOBLE SCAN DEL LECTOR
                limite_cooldown = fecha_hora - timedelta(minutes=15)
                reciente = Asistencia.objects.filter(
                    persona=persona,
                    fechaHora__gte=limite_cooldown,
                    fechaHora__lte=fecha_hora
                ).exists()

                if reciente:
                    self.stdout.write(self.style.WARNING(f'⚠️ Asistencia reciente (< 15 min) para {persona.nombre}. Ignorada globalmente (cooldown).'))
                    return
                
                inicio_dia = fecha_hora.replace(hour=0, minute=0, second=0, microsecond=0)
                fin_dia = inicio_dia + timedelta(days=1)
                
                acciones_a_guardar = []
                
                for h in horarios_candidatos:
                    start_dt = datetime.combine(fecha_hora.date(), h.hora_inicio)
                    start_dt_aware = timezone.make_aware(start_dt)
                    
                    end_dt = datetime.combine(fecha_hora.date(), h.hora_fin)
                    end_dt_aware = timezone.make_aware(end_dt)
                    
                    # 1. Chequear si falta entrada REAL (excluimos ausentes generados automáticamente)
                    tiene_entrada = Asistencia.objects.filter(
                        persona=persona, horario=h, tipo='Entrada',
                        fechaHora__gte=inicio_dia, fechaHora__lt=fin_dia
                    ).exists()  # tipo='Entrada' ya excluye los Ausentes (tipo=None)
                    
                    if not tiene_entrada:
                        # Rango válido para ENTRAR: [Inicio - 1 hora, Fin]
                        valid_start_entrada = start_dt_aware - timedelta(hours=1)
                        if valid_start_entrada <= fecha_hora <= end_dt_aware:
                            minutos_tarde = 0
                            # Tardanza: a partir de START + 5 minutos
                            if fecha_hora > (start_dt_aware + timedelta(minutes=5)):
                                diff = fecha_hora - start_dt_aware
                                minutos_tarde = int(diff.total_seconds() / 60)
                                estado_nombre = ESTADOS_ASISTENCIA['TARDANZA']
                            else:
                                estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                                
                            acciones_a_guardar.append({
                                'horario': h,
                                'tipo': 'Entrada',
                                'estado': estado_nombre,
                                'llegada_tarde_minutos': minutos_tarde,
                                'salida_temprano_minutos': 0
                            })
                    else:
                        # Tiene entrada. ¿Falta salida?
                        if persona.requiere_salida:
                            # Chequear si falta salida REAL (excluimos 'No pasó a la salida' automáticos)
                            tiene_salida = Asistencia.objects.filter(
                                persona=persona, horario=h, tipo='Salida',
                                fechaHora__gte=inicio_dia, fechaHora__lt=fin_dia
                            ).exists()  # tipo='Salida' ya excluye los No pasó salida (tipo=None)
                            
                            if not tiene_salida:
                                # Rango para SALIR: Una vez pasen 5 minutos del inicio de la clase en adelante (hasta 23:59)
                                if fecha_hora > (start_dt_aware + timedelta(minutes=5)) and fecha_hora < fin_dia:
                                    minutos_temprano = 0
                                    # Límite para irse antes permitido es FIN - 15 minutos
                                    limite_temprano = end_dt_aware - timedelta(minutes=15)
                                    
                                    if fecha_hora < limite_temprano:
                                        estado_nombre = ESTADOS_ASISTENCIA['SE_FUE_ANTES']
                                        diff_temprano = end_dt_aware - fecha_hora
                                        minutos_temprano = int(diff_temprano.total_seconds() / 60)
                                    else:
                                        estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                                        
                                    acciones_a_guardar.append({
                                        'horario': h,
                                        'tipo': 'Salida',
                                        'estado': estado_nombre,
                                        'llegada_tarde_minutos': 0,
                                        'salida_temprano_minutos': minutos_temprano
                                    })
                
                # Si no se encontró ninguna acción válida para ningún horario, entonces Fuera de Horario
                if not acciones_a_guardar:
                    acciones_a_guardar.append({
                        'horario': None,
                        'tipo': 'Entrada',
                        'estado': ESTADOS_ASISTENCIA['FUERA_DE_HORARIO'],
                        'llegada_tarde_minutos': 0,
                        'salida_temprano_minutos': 0
                    })
                    
                # ═══════════════════════════════════════════════
                # 6. GUARDAR ASISTENCIAS
                # ═══════════════════════════════════════════════
                for idx, accion in enumerate(acciones_a_guardar):
                    estado_obj, _ = EstadoAsistencia.objects.get_or_create(nombre=accion['estado'])
                    
                    institucion = None
                    if accion['horario']:
                        if accion['horario'].curso:
                            institucion = accion['horario'].curso.institucion
                        elif accion['horario'].persona_institucion:
                            institucion = accion['horario'].persona_institucion.institucion
                    else:
                        rol = PersonaInstitucion.objects.filter(persona=persona, activo=True).first()
                        if rol:
                            institucion = rol.institucion
                            
                    asistencia = Asistencia.objects.create(
                        persona=persona,
                        fechaHora=fecha_hora,
                        temperatura=temperatura,
                        estado=estado_obj,
                        horario=accion['horario'],
                        llegada_tarde_minutos=accion['llegada_tarde_minutos'],
                        salida_temprano_minutos=accion['salida_temprano_minutos'],
                        institucion=institucion,
                        tipo=accion['tipo'],
                        # Solo asignamos la foto codificada en la primera ejecución si existen dos registros simultáneos (superposición)
                        foto=foto_base64 if (idx == 0 and foto_base64 and foto_base64.strip()) else None
                    )
                    
                    if accion['horario']:
                        tarde_msg = f" (Tarde {accion['llegada_tarde_minutos']} min)" if accion['llegada_tarde_minutos'] > 0 and accion['tipo'] == 'Entrada' else ""
                        if accion['horario'].curso:
                            ctx_nombre = accion['horario'].curso.nombre
                        else:
                            ctx_nombre = f"Rol {accion['horario'].persona_institucion.tipo.nombre}"
                        log_msg = f"✅ Asistencia GUARDADA ({accion['tipo']}): {persona.nombre} - {ctx_nombre}{tarde_msg} [{accion['estado']}]"
                    else:
                        log_msg = f"✅ Asistencia GUARDADA (Entrada): {persona.nombre} - FUERA DE HORARIO ({fecha_hora.strftime('%H:%M')})"
                    
                    self.stdout.write(self.style.SUCCESS(log_msg))
                    logger.info(log_msg)


        except Exception as e:
            error_msg = f'❌ Error procesando asistencia: {e}'
            self.stdout.write(self.style.ERROR(error_msg))
            logger.error(f'{error_msg} - Info: {info}') 