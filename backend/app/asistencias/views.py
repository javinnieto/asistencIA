from rest_framework import viewsets, filters, mixins
from simple_history.models import HistoricalRecords
from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.contrib.contenttypes.models import ContentType
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated, IsAdminUser, SAFE_METHODS
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Institucion, TipoPersona, Curso, Persona, PersonaInstitucion, 
    EstadoAsistencia, Asistencia, Horario, ConflictoIdentidad, DiaNoLaborable,
    ConfiguracionSemana
)
from .serializers import (
    InstitucionSerializer, TipoPersonaSerializer, CursoSerializer, 
    PersonaSerializer, PersonaInstitucionSerializer, EstadoAsistenciaSerializer, 
    AsistenciaSerializer, PersonaCreateSerializer, PersonaInstitucionCreateSerializer,
    AsistenciaCreateSerializer, TipoPersonaCreateSerializer, CursoCreateSerializer,
    HorarioSerializer, HorarioCreateSerializer, ConflictoIdentidadSerializer,
    DiaNoLaborableSerializer, DiaNoLaborableCreateSerializer,
    ConfiguracionSemanaSerializer
)

from django.conf import settings
import json
import time
import paho.mqtt.client as mqtt
from datetime import datetime
from .constants import LECTOR_CONFIG

class EsAdminOGuardiaParaEscritura(BasePermission):
    """
    Permite GET/HEAD/OPTIONS a cualquier usuario autenticado.
    Para POST/PUT/PATCH/DELETE requiere is_staff=True.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff

class SoloAdminPuedeBorrar(BasePermission):
    def has_permission(self, request, view):
        if request.method == 'DELETE':
            return request.user.is_superuser
        return True


class AuditLogMixin:
    """
    Mixin para registrar acciones en LogEntry de Django y en Simple History.
    Esto hace que las acciones de la API aparezcan en el panel "Acciones Recientes" del Admin.
    """
    def _log_action(self, instance, action_flag, message=""):
        try:
            LogEntry.objects.log_action(
                user_id=self.request.user.id,
                content_type_id=ContentType.objects.get_for_model(instance).pk,
                object_id=instance.pk,
                object_repr=str(instance),
                action_flag=action_flag,
                change_message=message or f"{'Creado' if action_flag==ADDITION else 'Modificado'} vía API"
            )
        except Exception:
            pass

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_action(instance, ADDITION)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._log_action(instance, CHANGE)

    def perform_destroy(self, instance):
        self._log_action(instance, DELETION, message="Eliminado vía API")
        instance.delete()


class CustomPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 500


class InstitucionViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Institucion.objects.all()
    serializer_class = InstitucionSerializer
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']


class TipoPersonaViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = TipoPersona.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TipoPersonaCreateSerializer
        return TipoPersonaSerializer

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


class CursoViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['institucion', 'activo']
    search_fields = ['nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CursoCreateSerializer
        return CursoSerializer

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()



class HorarioViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Horario.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['curso', 'dia', 'activo']
    search_fields = ['materia', 'curso__nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return HorarioCreateSerializer
        return HorarioSerializer

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()
    
    # Propagate logic removed: Schedules are now strictly linked to Cursos.


def sync_editar_persona_lector(persona):
    """
    Sincroniza los cambios de nombre (y foto si la hay) de una persona hacia el dispositivo Lector.
    Usa el endpoint /action/EditPerson del lector.
    """
    try:
        from asistencias.constants import LECTOR_CONFIG
        import requests
        from requests.auth import HTTPBasicAuth
        import logging
        
        ip = LECTOR_CONFIG.get('DEVICE_IP', '192.168.210.101')
        user = LECTOR_CONFIG.get('API_USER', 'admin')
        password = LECTOR_CONFIG.get('API_PASSWORD', 'admin1234')
        device_id = int(LECTOR_CONFIG.get('DEVICE_ID', 1379241))
        
        payload_lib = {
            "operator": "EditPerson",
            "info": {
                "DeviceID": device_id,
                "IdType": 1,         # 1 = usar LibID (el ID interno asignado por el lector)
                "LibID": persona.idPersona,
                "Name": persona.nombre,
            }
        }
        
        # Opcional: si la API del lector espera foto, y el backend la tiene actualizada
        if persona.foto:
            payload_lib["picinfo"] = persona.foto
            
        import json
        requests.post(
            f"http://{ip}/action/EditPerson",
            data=json.dumps(payload_lib, ensure_ascii=False).encode('utf-8'),
            headers={'Content-Type': 'application/json; charset=utf-8'},
            auth=HTTPBasicAuth(user, password),
            timeout=5
        )
        logging.getLogger(__name__).info(f"Nombre de {persona.idPersona} sincronizado al Lector.")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Fallo editando persona {persona.idPersona} en dispositivo Lector: {e}")

def sync_eliminar_persona_lector(persona_id):
    """
    Elimina una persona del dispositivo Lector.
    Usa el endpoint /action/DeletePerson del lector.
    """
    try:
        from asistencias.constants import LECTOR_CONFIG
        import requests
        from requests.auth import HTTPBasicAuth
        import logging
        
        ip = LECTOR_CONFIG.get('DEVICE_IP', '192.168.210.101')
        user = LECTOR_CONFIG.get('API_USER', 'admin')
        password = LECTOR_CONFIG.get('API_PASSWORD', 'admin1234')
        device_id = int(LECTOR_CONFIG.get('DEVICE_ID', 1379241))
        
        # Eliminar usando LibID (IdType: 1)
        payload_lib = {
            "operator": "DeletePerson",
            "info": {
                "DeviceID": device_id,
                "TotalNum": 1,
                "IdType": 1,
                "LibID": [persona_id]  # <- IMPORTANTE: debe ser una lista
            }
        }
        
        import json
        requests.post(
            f"http://{ip}/action/DeletePerson",
            data=json.dumps(payload_lib, ensure_ascii=False).encode('utf-8'),
            headers={'Content-Type': 'application/json; charset=utf-8'},
            auth=HTTPBasicAuth(user, password),
            timeout=5
        )
        
        # Opcional: intentar por CustomizeID (IdType: 0) por compatibilidad
        payload_cust = {
            "operator": "DeletePerson",
            "info": {
                "DeviceID": device_id,
                "TotalNum": 1,
                "IdType": 0,
                "CustomizeID": [persona_id]
            }
        }
        requests.post(
            f"http://{ip}/action/DeletePerson",
            data=json.dumps(payload_cust, ensure_ascii=False).encode('utf-8'),
            headers={'Content-Type': 'application/json; charset=utf-8'},
            auth=HTTPBasicAuth(user, password),
            timeout=5
        )
        
        logging.getLogger(__name__).info(f"Persona {persona_id} eliminada del Lector.")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Fallo eliminando persona {persona_id} del dispositivo Lector: {e}")



class PersonaViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'idPersona']
    ordering_fields = ['nombre', 'idPersona']
    ordering = ['nombre']
    pagination_class = CustomPageNumberPagination

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Devuelve contadores agregados de personas SIN traer todos los registros.
        Aplica los mismos filtros que el listado (activo, search) usando el
        queryset ya filtrado por get_queryset().
        """
        from django.db.models import Count, Q
        qs = self.filter_queryset(self.get_queryset())

        totales = qs.aggregate(
            total=Count('idPersona'),
            activos=Count('idPersona', filter=Q(activo=True)),
            inactivos=Count('idPersona', filter=Q(activo=False)),
        )

        # Conteo por tipo de persona (usando PersonaInstitucion para no hacer N+1)
        from asistencias.models import PersonaInstitucion
        persona_ids = qs.values_list('idPersona', flat=True)
        tipos = (
            PersonaInstitucion.objects
            .filter(persona_id__in=persona_ids, activo=True)
            .values('tipo__nombre')
            .annotate(cantidad=Count('persona_id', distinct=True))
            .order_by('-cantidad')
        )

        return Response({
            'total': totales['total'],
            'activos': totales['activos'],
            'inactivos': totales['inactivos'],
            'por_tipo': list(tipos),
        })

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PersonaCreateSerializer
        return PersonaSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Clonar datos para poder modificarlos
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        
        # Extraer roles del payload
        roles_data = data.pop('roles', None)
        
        # Si no se proporciona idPersona, generar uno
        if 'idPersona' not in data or not data['idPersona']:
            from django.db.models import Max
            max_id = Persona.objects.aggregate(Max('idPersona'))['idPersona__max']
            data['idPersona'] = (max_id + 1) if max_id is not None else 100000
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        instance = serializer.instance
        
        # Sincronizar roles
        if roles_data:
            for role in roles_data:
                inst_id = role.get('institucion', {}).get('idInstitucion') if isinstance(role.get('institucion'), dict) else role.get('institucion')
                tipo_id = role.get('tipo', {}).get('idTipoPersona') if isinstance(role.get('tipo'), dict) else role.get('tipo')
                curso_id = role.get('curso', {}).get('idCurso') if isinstance(role.get('curso'), dict) else role.get('curso')

                if inst_id and tipo_id:
                    pi = PersonaInstitucion.objects.create(
                        persona=instance,
                        institucion_id=inst_id,
                        tipo_id=tipo_id,
                        curso_id=curso_id if curso_id else None
                    )
                    
                    horarios_personales = role.get('horarios_personalizados', [])
                    for h_data in horarios_personales:
                        Horario.objects.create(
                            persona_institucion=pi,
                            dia=h_data.get('dia'),
                            hora_inicio=h_data.get('hora_inicio'),
                            hora_fin=h_data.get('hora_fin'),
                            materia=h_data.get('materia', 'Personalizado'),
                            activo=h_data.get('activo', True)
                        )
                        
        headers = self.get_success_headers(serializer.data)
        # Retornar el objeto serializado completamente
        from rest_framework import status
        return Response(PersonaSerializer(instance).data, status=status.HTTP_201_CREATED, headers=headers)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Extraer roles del payload
        roles_data = request.data.pop('roles', None)
        
        # foto viene como TextField (Base64 string o URL), no necesita procesamiento especial
        
        # Actualizar datos básicos de la persona
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Sincronizar roles si se proporcionan
        if roles_data is not None:
            # Eliminar roles actuales y recrear con los nuevos
            PersonaInstitucion.objects.filter(persona=instance).delete()
            
            for role in roles_data:
                # Extraer IDs, manejando tanto objetos anidados como IDs directos
                inst_id = role.get('institucion', {}).get('idInstitucion') if isinstance(role.get('institucion'), dict) else role.get('institucion')
                tipo_id = role.get('tipo', {}).get('idTipoPersona') if isinstance(role.get('tipo'), dict) else role.get('tipo')
                curso_id = role.get('curso', {}).get('idCurso') if isinstance(role.get('curso'), dict) else role.get('curso')

                if inst_id and tipo_id:
                    pi = PersonaInstitucion.objects.create(
                        persona=instance,
                        institucion_id=inst_id,
                        tipo_id=tipo_id,
                        curso_id=curso_id if curso_id else None
                    )
                    
                    horarios_personales = role.get('horarios_personalizados', [])
                    for h_data in horarios_personales:
                        Horario.objects.create(
                            persona_institucion=pi,
                            dia=h_data.get('dia'),
                            hora_inicio=h_data.get('hora_inicio'),
                            hora_fin=h_data.get('hora_fin'),
                            materia=h_data.get('materia', 'Personalizado'),
                            activo=h_data.get('activo', True)
                        )
        
        # Retornar el objeto actualizado
        return Response(PersonaSerializer(instance).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        instance._history_user = self.request.user
        instance.save()
        self._log_action(instance, CHANGE)
        # Sincronizar el nombre al lector
        sync_editar_persona_lector(instance)

    def perform_create(self, serializer):
        instance = serializer.save()
        instance._history_user = self.request.user
        instance.save()
        self._log_action(instance, ADDITION)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'No tienes permisos para eliminar personas. Debes ser Administrador.'}, status=403)
        instance = self.get_object()
        person_id = instance.idPersona
        
        # Eliminar también del dispositivo Lector
        try:
            from asistencias.constants import LECTOR_CONFIG
            import requests
            from requests.auth import HTTPBasicAuth
            
            ip = LECTOR_CONFIG.get('DEVICE_IP', '192.168.210.101')
            user = LECTOR_CONFIG.get('API_USER', 'admin')
            password = LECTOR_CONFIG.get('API_PASSWORD', 'admin1234')
            device_id = int(LECTOR_CONFIG.get('DEVICE_ID', 1379241))
            
            # Intentar borrar como CustomizeID (IdType: 0)
            payload_cust = {
                "operator": "DeletePerson",
                "info": {
                    "DeviceID": device_id,
                    "TotalNum": 1,
                    "IdType": 0,
                    "CustomizeID": [person_id]
                }
            }
            requests.post(
                f"http://{ip}/action/DeletePerson",
                json=payload_cust,
                auth=HTTPBasicAuth(user, password),
                timeout=5
            )
            
            # Intentar borrar como LibID (IdType: 1) para mayor seguridad
            payload_lib = {
                "operator": "DeletePerson",
                "info": {
                    "DeviceID": device_id,
                    "TotalNum": 1,
                    "IdType": 1,
                    "LibID": [person_id]
                }
            }
            requests.post(
                f"http://{ip}/action/DeletePerson",
                json=payload_lib,
                auth=HTTPBasicAuth(user, password),
                timeout=5
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Fallo eliminando del dispositivo: {e}")

        self.perform_destroy(instance)
        return Response(status=204)

    @action(detail=False, methods=['post'], url_path='bulk-delete', permission_classes=[IsAdminUser])
    @transaction.atomic
    def bulk_delete(self, request):
        """Elimina múltiples personas en un solo request.
        
        Body: { "ids": [1, 2, 3] }
        - Primero hace UN solo request al lector con todos los IDs (TotalNum=N, array completo).
        - Luego borra cada persona de la BD.
        Responde con cuántas se eliminaron y cuántas fallaron.
        """
        if not request.user.is_superuser:
            return Response({'error': 'Solo el Administrador puede eliminar personas.'}, status=403)

        ids = request.data.get('ids', [])
        if not ids or not isinstance(ids, list):
            return Response({'error': 'Debes enviar una lista de IDs en el campo "ids".'}, status=400)

        import requests as http_requests
        from requests.auth import HTTPBasicAuth
        import logging
        logger = logging.getLogger(__name__)

        ip       = LECTOR_CONFIG.get('DEVICE_IP', '192.168.210.101')
        api_user = LECTOR_CONFIG.get('API_USER', 'admin')
        password = LECTOR_CONFIG.get('API_PASSWORD', 'admin1234')
        device_id = int(LECTOR_CONFIG.get('DEVICE_ID', 1379241))

        # Convertir todos los IDs a int
        int_ids = []
        for raw_id in ids:
            try:
                int_ids.append(int(raw_id))
            except (ValueError, TypeError):
                pass

        total_num = len(int_ids)

        # --- Un solo request al lector con TODOS los IDs en el array ---
        # La API del dispositivo acepta TotalNum=N y CustomizeID=[id1, id2, ...]
        # según la documentación (sección 3.11.1).
        if int_ids:
            try:
                # Por CustomizeID (IdType: 0)
                http_requests.post(
                    f"http://{ip}/action/DeletePerson",
                    json={"operator": "DeletePerson", "info": {
                        "DeviceID": device_id,
                        "TotalNum": total_num,
                        "IdType": 0,
                        "CustomizeID": int_ids
                    }},
                    auth=HTTPBasicAuth(api_user, password), timeout=15
                )
                # Por LibID (IdType: 1) — por seguridad, también
                http_requests.post(
                    f"http://{ip}/action/DeletePerson",
                    json={"operator": "DeletePerson", "info": {
                        "DeviceID": device_id,
                        "TotalNum": total_num,
                        "IdType": 1,
                        "LibID": int_ids
                    }},
                    auth=HTTPBasicAuth(api_user, password), timeout=15
                )
            except Exception as e:
                logger.warning(f"bulk-delete: fallo HTTP lector para IDs {int_ids}: {e}")

        # --- Borrar de la BD ---
        deleted = 0
        failed  = []

        for person_id in int_ids:
            try:
                instance = Persona.objects.get(idPersona=person_id)
                self.perform_destroy(instance)
                deleted += 1
            except Persona.DoesNotExist:
                failed.append({'id': person_id, 'error': 'No encontrada'})
            except Exception as e:
                failed.append({'id': person_id, 'error': str(e)})

        return Response({
            'deleted': deleted,
            'failed': len(failed),
            'errors': failed
        }, status=200)

    @action(detail=False, methods=['post'], url_path='sync-device', permission_classes=[IsAdminUser])
    def sync_device(self, request):
        res = sync_device_background(full_sync=True)
        from rest_framework.response import Response
        status_code = res.pop("status", 500)
        return Response(res, status=status_code)

def sync_device_background(full_sync=False):
    """
    Función agnóstica para solicitar al dispositivo la lista de personas 
    (Sincronización manual o automática vía API HTTP del lector).
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from asistencias.models import SincronizacionDispositivo, Persona, ConflictoIdentidad
        from asistencias.constants import LECTOR_CONFIG
        from django.utils import timezone
        from django.db import transaction
        import requests
        from requests.auth import HTTPBasicAuth
        
        # 1. Rango de fechas
        ultima_sync = SincronizacionDispositivo.objects.filter(completada=True).order_by('idSincronizacion').last()
        if not full_sync and ultima_sync:
            fecha_inicio = ultima_sync.fecha_fin
        else:
            fecha_inicio = timezone.make_aware(datetime(2020, 1, 1))
            
        fecha_fin = timezone.now()
        
        sincronizacion = SincronizacionDispositivo.objects.create(
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            completada=False
        )
        
        fmt = "%Y-%m-%dT%H:%M:%S"
        ip = LECTOR_CONFIG.get('DEVICE_IP', '192.168.210.101')
        user = LECTOR_CONFIG.get('API_USER', 'admin')
        password = LECTOR_CONFIG.get('API_PASSWORD', 'admin1234')
        device_id = int(LECTOR_CONFIG.get('DEVICE_ID', 1379241))
        
        nuevas_db = 0
        encontradas = 0
        begin_no = 0
        has_more = True
        
        while has_more:
            payload = {
                "operator": "SearchPersonList",
                "info": {
                    "DeviceID": device_id,
                    "PersonType": 2, 
                    "BeginTime": fecha_inicio.strftime(fmt),
                    "EndTime": fecha_fin.strftime(fmt),
                    "Gender": 2,
                    "BeginNO": begin_no,
                    "RequestCount": 100,
                    "Picture": 1
                }
            }
            
            logger.info(f"➜ Solicitando lote HTTP: {begin_no} a {begin_no + 100}...")
            resp = requests.post(
                f"http://{ip}/action/SearchPersonList",
                json=payload,
                auth=HTTPBasicAuth(user, password),
                timeout=15
            )
            
            if resp.status_code != 200:
                raise Exception(f"Device HTTP Error {resp.status_code}: {resp.text}")
                
            data = resp.json()
            info = data.get('info', {})
            
            if info.get('Result') == 'Fail':
                if info.get('Detail') == "can't find person":
                    # No hay más personas para recuperar
                    has_more = False
                    break
                raise Exception(f"API Error: {info.get('Detail')}")
            
            personas_list = info.get('List', [])
            list_num = info.get('Listnum', len(personas_list))
            total_num = info.get('Totalnum', 0)
            logger.info(f"✓ Recibidas {list_num} personas (Total Device: {total_num})")
            
            if not personas_list:
                has_more = False
                break
                
            with transaction.atomic():
                # Ordenar por LibID ascendente: menor ID = más antiguo = debe procesarse primero
                # Así cuando llega un duplicado, la persona ya-en-BD siempre será la de menor ID
                personas_list_ordenadas = sorted(
                    [p for p in personas_list if p.get('LibID')],
                    key=lambda p: int(p['LibID'])
                )
                for p_data in personas_list_ordenadas:
                    person_id = None
                    # Use strictly the automatic internal ID assigned by the lector hardware
                    if p_data.get('LibID'):
                        person_id = int(p_data['LibID'])
                    else:
                        continue
                        
                    nombre = p_data.get('Name', f'Usuario Sync {person_id}')
                    person_type = str(p_data.get('PersonType', 1))
                    # p_data.get('Gender') returns 0/1/2
                    foto_b64 = p_data.get('Picinfo', None)
                    
                    must_mark_exit = person_type != LECTOR_CONFIG.get('PERSON_TYPE_ESTUDIANTE', '0')
                    
                    # --- DETECCION DE DUPLICADOS (marcadores) ---
                    conflicto_pendiente = None
                    duplicados_foto = None
                    if foto_b64:
                        duplicados_foto = Persona.objects.filter(foto=foto_b64).exclude(idPersona=person_id)
                    duplicados_nombre = Persona.objects.filter(nombre__iexact=nombre).exclude(idPersona=person_id)

                    if duplicados_foto and duplicados_foto.exists():
                        vieja = duplicados_foto.first()
                        logger.warning(f"DUPLICADO FOTO: ID {person_id} ({nombre}) tiene foto idéntica a {vieja.idPersona} ({vieja.nombre}).")
                        conflicto_pendiente = {'vieja': vieja, 'tipo': 'foto'}

                    elif duplicados_nombre.exists():
                        vieja = duplicados_nombre.first()
                        logger.warning(f"DUPLICADO NOMBRE: ID {person_id} ({nombre}) comparte nombre con {vieja.idPersona}.")
                        conflicto_pendiente = {'vieja': vieja, 'tipo': 'nombre'}
                    # --------------------------------------------------

                    # Crear/obtener la persona nueva (la que viene desde el lector)
                    persona_obj, created = Persona.objects.get_or_create(
                        idPersona=person_id,
                        defaults={
                            'nombre': nombre,
                            'activo': True,
                            'requiere_salida': must_mark_exit,
                            'foto': foto_b64
                        }
                    )

                    if created:
                        nuevas_db += 1
                    else:
                        # Actualizar a quien ya existe si tiene nombre genérico o foto distinta
                        updated = False
                        if persona_obj.nombre.startswith('Persona ') or persona_obj.nombre == f'Usuario Sync {person_id}':
                            persona_obj.nombre = nombre
                            updated = True
                        if str(foto_b64) != str(persona_obj.foto) and foto_b64:
                            persona_obj.foto = foto_b64
                            updated = True
                        if updated:
                            persona_obj.save(update_fields=['nombre', 'foto'])

                    # Registrar conflicto si se detectó duplicado
                    if conflicto_pendiente:
                        vieja = conflicto_pendiente['vieja']

                        # Determinar quién es el original y quién el nuevo
                        if vieja.idPersona < persona_obj.idPersona:
                            persona_original = vieja
                            persona_nueva_id = persona_obj.idPersona
                        else:
                            persona_original = persona_obj
                            persona_nueva_id = vieja.idPersona

                        # Evitar duplicar el registro de conflicto
                        ya_existe = ConflictoIdentidad.objects.filter(
                            persona_db=persona_original,
                            id_persona_nueva=persona_nueva_id,
                            resuelto=False
                        ).exists()

                        if not ya_existe:
                            ConflictoIdentidad.objects.create(
                                persona_db=persona_original,
                                nombre_recibido=nombre,
                                foto_recibida=foto_b64,
                                id_persona_nueva=persona_nueva_id
                            )
            
            encontradas += list_num
            if list_num < 100 or encontradas >= total_num:
                has_more = False
            else:
                begin_no += list_num

        # Finalizar registro de sync
        sincronizacion.personas_encontradas = encontradas
        sincronizacion.personas_nuevas = nuevas_db
        sincronizacion.completada = True
        sincronizacion.save()
        
        logger.info(f"✨ Sincronización Finalizada: {nuevas_db} importados / {encontradas} procesados.")
        
        return {
            "message": f"Sincronización completada. Se importaron {nuevas_db} personas nuevas ({encontradas} en total).",
            "rango": f"{fecha_inicio.strftime(fmt)} hasta {fecha_fin.strftime(fmt)}",
            "id_sincronizacion": sincronizacion.pk,
            "status": 200
        }
    except Exception as e:
        logger.error(f"Error HTTP Sync: {str(e)}")
        # Eliminar la sincronizacion si falló a la mitad
        if 'sincronizacion' in locals() and not sincronizacion.completada:
            sincronizacion.delete()
        return {"error": str(e), "status": 500}


class PersonaInstitucionViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = PersonaInstitucion.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['persona', 'institucion', 'tipo', 'curso', 'activo']
    search_fields = ['persona__nombre', 'institucion__nombre', 'tipo__nombre', 'curso__nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PersonaInstitucionCreateSerializer
        return PersonaInstitucionSerializer


class EstadoAsistenciaViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = EstadoAsistencia.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    serializer_class = EstadoAsistenciaSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']


class AsistenciaViewSet(AuditLogMixin, viewsets.ModelViewSet):
    queryset = Asistencia.objects.all().select_related('persona', 'estado', 'horario', 'horario__curso').order_by('-fechaHora')
    permission_classes = [EsAdminOGuardiaParaEscritura]
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'persona': ['exact'],
        'fechaHora': ['date', 'gte', 'lte'],
        'estado': ['exact'],
        'estado__nombre': ['exact'],
        'horario': ['isnull'],
        'horario__curso': ['exact'],
        'institucion': ['exact'],
        'temperatura': ['gte', 'lte'],
        'justificado': ['exact'],
    }
    search_fields = ['persona__nombre']
    ordering_fields = ['fechaHora', 'temperatura', 'persona__nombre', 'horario__curso__nombre', 'estado__nombre']
    ordering = ['-fechaHora']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AsistenciaCreateSerializer
        return AsistenciaSerializer

    def _check_guardia_restrictions(self, request):
        if not request.user.is_superuser:
            data_keys = set(request.data.keys())
            allowed_keys = {'justificado'}
            if not data_keys.issubset(allowed_keys):
                from rest_framework.response import Response
                return Response(
                    {'error': 'Los Guardias solo pueden justificar asistencias, no modificar horarios o eliminar datos.'},
                    status=403
                )
        return None

    def update(self, request, *args, **kwargs):
        error = self._check_guardia_restrictions(request)
        if error: return error
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        error = self._check_guardia_restrictions(request)
        if error: return error
        return super().partial_update(request, *args, **kwargs)
        
    def perform_update(self, serializer):
        """Recalcular estado, tardanza y horario al modificar fechaHora.
        
        SIEMPRE busca el mejor horario candidato de la persona para la
        fechaHora dada, filtrando por día de la semana. Prioriza horarios
        "en curso" (hora_inicio <= t <= hora_fin) sobre los que están en
        ventana previa (hora_inicio - 1h <= t < hora_inicio).
        """
        from datetime import timedelta, datetime
        from django.utils import timezone
        from django.db.models import Q
        from asistencias.models import (
            EstadoAsistencia, PersonaInstitucion, Horario
        )
        from asistencias.constants import ESTADOS_ASISTENCIA

        asistencia = self.get_object()
        nueva_fecha_hora = serializer.validated_data.get('fechaHora', asistencia.fechaHora)

        # Convertir a aware datetime si es necesario
        if timezone.is_naive(nueva_fecha_hora):
            nueva_fecha_hora = timezone.make_aware(nueva_fecha_hora)

        # ── Buscar el mejor horario ─────────────────────────────
        dias_map = {
            0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves',
            4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
        }
        dia_actual = dias_map[nueva_fecha_hora.weekday()]

        cursos_ids = PersonaInstitucion.objects.filter(
            persona=asistencia.persona, activo=True,
            curso__isnull=False, curso__activo=True
        ).values_list('curso_id', flat=True)

        roles_ids = PersonaInstitucion.objects.filter(
            persona=asistencia.persona, activo=True
        ).values_list('idPersonaInstitucion', flat=True)

        horarios_candidatos = Horario.objects.filter(
            Q(curso_id__in=cursos_ids) | Q(persona_institucion_id__in=roles_ids),
            dia=dia_actual, activo=True
        )

        # Clasificar candidatos: "en curso" tiene prioridad sobre "ventana previa"
        horario = None
        horario_ventana = None  # fallback si no hay match "en curso"

        for h in horarios_candidatos:
            start_dt = timezone.make_aware(
                datetime.combine(nueva_fecha_hora.date(), h.hora_inicio))
            end_dt = timezone.make_aware(
                datetime.combine(nueva_fecha_hora.date(), h.hora_fin))
            pre_start = start_dt - timedelta(hours=1)

            if start_dt <= nueva_fecha_hora <= end_dt:
                # Match "en curso" — máxima prioridad
                horario = h
                break
            elif pre_start <= nueva_fecha_hora < start_dt:
                # Match "ventana previa" — solo si no hay otro mejor
                if horario_ventana is None:
                    horario_ventana = h

        if not horario:
            horario = horario_ventana

        # ── Recalcular estado ───────────────────────────────────
        if horario:
            start_dt = timezone.make_aware(
                datetime.combine(nueva_fecha_hora.date(), horario.hora_inicio))
            end_dt = timezone.make_aware(
                datetime.combine(nueva_fecha_hora.date(), horario.hora_fin))
            valid_start = start_dt - timedelta(hours=1)

            if valid_start <= nueva_fecha_hora <= end_dt:
                if nueva_fecha_hora > start_dt:
                    minutos_tarde = int(
                        (nueva_fecha_hora - start_dt).total_seconds() / 60)
                    if minutos_tarde >= 1:
                        estado_nombre = ESTADOS_ASISTENCIA['TARDANZA']
                    else:
                        minutos_tarde = 0
                        estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                else:
                    minutos_tarde = 0
                    estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
            else:
                minutos_tarde = 0
                estado_nombre = ESTADOS_ASISTENCIA['FUERA_DE_HORARIO']

            estado_obj, _ = EstadoAsistencia.objects.get_or_create(nombre=estado_nombre)
            serializer.validated_data['estado'] = estado_obj
            serializer.validated_data['horario'] = horario
            serializer.validated_data['llegada_tarde_minutos'] = minutos_tarde

            # Asignar institución si falta
            if not asistencia.institucion:
                if horario.curso:
                    serializer.validated_data['institucion'] = horario.curso.institucion
                elif horario.persona_institucion:
                    serializer.validated_data['institucion'] = horario.persona_institucion.institucion
        else:
            # Sin horario matcheante → Fuera de Horario
            estado_obj, _ = EstadoAsistencia.objects.get_or_create(
                nombre=ESTADOS_ASISTENCIA['FUERA_DE_HORARIO'])
            serializer.validated_data['estado'] = estado_obj
            serializer.validated_data['horario'] = None
            serializer.validated_data['llegada_tarde_minutos'] = 0

        instance = serializer.save()
        self._log_action(instance, CHANGE)

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log_action(instance, ADDITION)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Retorna estadísticas agregadas basadas en los filtros actuales.
        Ignora la paginación para calcular sobre todo el dataset filtrado.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calcular estadísticas
        total = queryset.count()
        presentes = queryset.filter(estado__nombre='Presente').count()
        ausentes = queryset.filter(estado__nombre='Ausente').count()
        tardanzas = queryset.filter(estado__nombre='Tardanza').count()
        fiebre = queryset.filter(temperatura__gt=37.5).count()
        justificados = queryset.filter(justificado=True).count()
        
        return Response({
            'total': total,
            'presentes': presentes,
            'ausentes': ausentes,
            'tardanzas': tardanzas,
            'fiebre': fiebre,
            'justificados': justificados
        })

    @action(detail=False, methods=['get'], url_path='chart-data')
    def chart_data(self, request):
        """
        Retorna datos agrupados para el gráfico del dashboard.
        Agrupa por hora (vista diaria) o por fecha (vista semanal/mensual/custom).
        Evita que el frontend tenga que paginar todos los registros.
        """
        from django.db.models import Count, Avg, Q
        from django.db.models.functions import TruncHour, TruncDate

        queryset = self.filter_queryset(self.get_queryset())

        # Determinar agrupación: por hora si es un solo día, por fecha si es rango
        group_by = request.query_params.get('group_by', 'date')

        if group_by == 'hour':
            # Agrupar por hora
            data = (
                queryset
                .annotate(period=TruncHour('fechaHora'))
                .values('period')
                .annotate(
                    presentes=Count('idAsistencia', filter=Q(estado__nombre='Presente')),
                    ausentes=Count('idAsistencia', filter=Q(estado__nombre='Ausente')),
                    tardanzas=Count('idAsistencia', filter=Q(estado__nombre='Tardanza')),
                    avgTemp=Avg('temperatura', filter=Q(temperatura__gt=0)),
                )
                .order_by('period')
            )
            result = []
            for item in data:
                period = item['period']
                result.append({
                    'name': f"{period.hour}:00" if period else '',
                    'presentes': item['presentes'],
                    'ausentes': item['ausentes'],
                    'tardanzas': item['tardanzas'],
                    'avgTemp': round(item['avgTemp'], 1) if item['avgTemp'] else 0,
                })
        else:
            # Agrupar por fecha
            data = (
                queryset
                .annotate(period=TruncDate('fechaHora'))
                .values('period')
                .annotate(
                    presentes=Count('idAsistencia', filter=Q(estado__nombre='Presente')),
                    ausentes=Count('idAsistencia', filter=Q(estado__nombre='Ausente')),
                    tardanzas=Count('idAsistencia', filter=Q(estado__nombre='Tardanza')),
                    avgTemp=Avg('temperatura', filter=Q(temperatura__gt=0)),
                )
                .order_by('period')
            )
            result = []
            for item in data:
                period = item['period']
                if period:
                    # Formato corto: "lun. 5", "mar. 6"
                    import locale
                    try:
                        locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
                    except locale.Error:
                        pass
                    name = period.strftime('%a %d').capitalize()
                else:
                    name = ''
                result.append({
                    'name': name,
                    'presentes': item['presentes'],
                    'ausentes': item['ausentes'],
                    'tardanzas': item['tardanzas'],
                    'avgTemp': round(item['avgTemp'], 1) if item['avgTemp'] else 0,
                })

        return Response(result)

class ConflictoIdentidadViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    API endpoint para ver y resolver conflictos de identidad
    (Ej: la cámara detectó un nombre distinto al de la BD para el mismo ID)
    """
    queryset = ConflictoIdentidad.objects.all().order_by('-fechaHora')
    serializer_class = ConflictoIdentidadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['resuelto']
    search_fields = ['nombre_recibido', 'persona_db__nombre', 'persona_db__idPersona']

    @action(detail=True, methods=['post'])
    def ignorar(self, request, pk=None):
        """Ignora el conflicto y lo borra / marca resuelto"""
        conflicto = self.get_object()
        conflicto.resuelto = True
        conflicto._history_user = request.user
        conflicto.save()
        self._log_action(conflicto, CHANGE, message="Conflicto ignorado vía API")
        return Response({'status': 'Conflicto ignorado y resuelto'})

    @action(detail=True, methods=['post'])
    def aceptar_cambio(self, request, pk=None):
        """Acepta el nuevo nombre y lo actualiza en la Base de Datos"""
        try:
            conflicto = self.get_object()
            persona = conflicto.persona_db

            persona.nombre = conflicto.nombre_recibido

            if conflicto.foto_recibida:
                persona.foto = conflicto.foto_recibida

            persona._history_user = request.user
            persona.save()
            self._log_action(persona, CHANGE, message="Nombre actualizado por conflicto vía API")
            
            # Sincronizar cambio al lector
            sync_editar_persona_lector(persona)

            conflicto.resuelto = True
            conflicto._history_user = request.user
            conflicto.save()
            self._log_action(conflicto, CHANGE, message="Conflicto resuelto aceptando cambio vía API")

            ConflictoIdentidad.objects.filter(persona_db=persona, resuelto=False).update(resuelto=True)

            return Response({'status': 'nombre actualizado y conflicto resuelto'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def actualizar_nombre(self, request, pk=None):
        """
        Permite actualizar el nombre de la persona en la BD al resolver el conflicto.
        Body: { "nombre": "nuevo nombre" }
        """
        try:
            conflicto = self.get_object()
            persona = conflicto.persona_db

            if 'nombre' in request.data:
                persona.nombre = request.data['nombre']
            if 'apellido' in request.data:
                persona.apellido = request.data['apellido']

            persona._history_user = request.user
            persona.save()
            self._log_action(persona, CHANGE, message="Nombre/apellido actualizado al resolver conflicto vía API")

            # Sincronizar cambio al lector
            sync_editar_persona_lector(persona)

            conflicto.resuelto = True
            conflicto._history_user = request.user
            conflicto.save()
            self._log_action(conflicto, CHANGE, message="Conflicto resuelto actualizando nombre vía API")

            ConflictoIdentidad.objects.filter(persona_db=persona, resuelto=False).update(resuelto=True)

            return Response({'status': 'nombre actualizado y conflicto resuelto'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def eliminar_duplicado(self, request, pk=None):
        """
        Elimina la persona más reciente (la detectada por el lector, que generó el conflicto)
        y resuelve el conflicto. La persona en BD queda intacta.
        Recibe: { "id_persona_nueva": <int> } — el ID de la persona nueva a borrar.
        """
        try:
            conflicto = self.get_object()
            id_nuevo = request.data.get('id_persona_nueva')

            if id_nuevo:
                # Eliminar todas las asistencias de esa persona antes de borrarla
                from .models import Asistencia, PersonaInstitucion
                try:
                    persona_nueva = Persona.objects.get(idPersona=id_nuevo)
                    Asistencia.objects.filter(persona=persona_nueva).delete()
                    PersonaInstitucion.objects.filter(persona=persona_nueva).delete()
                    # Resolver todos los conflictos donde esta persona sea la de BD
                    ConflictoIdentidad.objects.filter(persona_db=persona_nueva).update(resuelto=True)
                    # Sincronizar borrado al lector ANTES de borrar de BD
                    sync_eliminar_persona_lector(id_nuevo)
                    
                    persona_nueva.delete()
                    self._log_action(conflicto, CHANGE, message=f"Duplicado ID {id_nuevo} eliminado al resolver conflicto")
                except Persona.DoesNotExist:
                    pass  # Si ya no existe, no hay problema

            # Marcar este conflicto como resuelto
            conflicto.resuelto = True
            conflicto._history_user = request.user
            conflicto.save()
            self._log_action(conflicto, CHANGE, message="Conflicto resuelto eliminando duplicado más reciente")

            # Marcar todos los conflictos pendientes de la persona en BD como resueltos
            ConflictoIdentidad.objects.filter(persona_db=conflicto.persona_db, resuelto=False).update(resuelto=True)

            return Response({'status': 'duplicado eliminado y conflicto resuelto'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DiaNoLaborableViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    API endpoint para gestionar días no laborables (feriados, excepciones).
    """
    queryset = DiaNoLaborable.objects.all().order_by('-fecha_inicio')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['institucion', 'fecha_inicio', 'aplica_a_todos']
    search_fields = ['motivo']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DiaNoLaborableCreateSerializer
        return DiaNoLaborableSerializer

    def perform_create(self, serializer):
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()


class ConfiguracionSemanaViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """Gestión de la configuración de Semana A/B (singleton)."""
    queryset = ConfiguracionSemana.objects.all()
    serializer_class = ConfiguracionSemanaSerializer

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'])
    def actual(self, request):
        """GET /api/configuracion-semana/actual/ → devuelve la semana vigente"""
        semana = ConfiguracionSemana.get_semana_actual()
        config = ConfiguracionSemana.objects.first()
        return Response({
            'semana': semana,
            'fecha_referencia': config.fecha_referencia_semana_a.isoformat() if config else None
        })


# ─── Unified Audit Log ───────────────────────────────────────────────────────

from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
import itertools
import operator

HISTORY_MODELS = {
    'Persona':           lambda: Persona.history.model,
    'Asistencia':        lambda: Asistencia.history.model,
    'Curso':             lambda: Curso.history.model,
    'Institucion':       lambda: Institucion.history.model,
    'TipoPersona':       lambda: TipoPersona.history.model,
    'Horario':           lambda: Horario.history.model,
    'PersonaInstitucion':lambda: PersonaInstitucion.history.model,
    'EstadoAsistencia':  lambda: EstadoAsistencia.history.model,
    'DiaNoLaborable':    lambda: DiaNoLaborable.history.model,
}

HISTORY_TYPE_MAP = {'+': 'Creado', '~': 'Modificado', '-': 'Eliminado'}



SKIP_DIFF_FIELDS = {
    'history_id', 'history_date', 'history_change_reason',
    'history_type', 'history_user_id', 'history_user',
}

def _get_diff(h):
    """Return list of {field, old, new} for a history record."""
    if h.history_type == '+':
        return None  # new object — no diff needed, just say "Creado"
    if h.history_type == '-':
        return None  # deleted — no before state

    try:
        prev = h.prev_record
    except Exception:
        prev = None

    if prev is None:
        return None

    changes = []
    for field in h._meta.fields:
        name = field.name
        if name in SKIP_DIFF_FIELDS or name.startswith('history_'):
            continue
            
        # Use field.attname (like 'horario_id' instead of 'horario') 
        # to avoid triggering DB lookups for deleted foreign keys.
        attname = field.attname
        new_val = getattr(h, attname, None)
        old_val = getattr(prev, attname, None)
        
        if old_val != new_val:
            changes.append({
                'field': name,
                'old':   str(old_val) if old_val is not None else '',
                'new':   str(new_val) if new_val is not None else '',
            })
    return changes if changes else None


class AuditLogView(APIView):
    """
    GET /api/audit-log/
    Retorna un historial unificado de todos los cambios registrados por simple_history.
    Parámetros opcionales:
      - model: nombre del modelo (ej. 'Persona', 'Asistencia')
      - user: username
      - action: '+', '~' o '-'
      - date_from: YYYY-MM-DD
      - date_to:   YYYY-MM-DD
      - page, page_size
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        filter_model  = request.query_params.get('model')
        filter_user   = request.query_params.get('user')
        filter_action = request.query_params.get('action')
        date_from     = request.query_params.get('date_from')
        date_to       = request.query_params.get('date_to')

        # Only admins see all logs; staff/guardia only see their own
        is_admin = request.user.is_superuser

        all_entries = []

        models_to_query = {filter_model: HISTORY_MODELS[filter_model]} if filter_model and filter_model in HISTORY_MODELS else HISTORY_MODELS

        for model_name, model_factory in models_to_query.items():
            HistModel = model_factory()
            qs = HistModel.objects.all()

            if filter_user:
                try:
                    u = User.objects.get(username=filter_user)
                    qs = qs.filter(history_user=u)
                except User.DoesNotExist:
                    qs = qs.none()
            if not is_admin:
                qs = qs.filter(history_user=request.user)
            if filter_action:
                qs = qs.filter(history_type=filter_action)
            if date_from:
                qs = qs.filter(history_date__date__gte=date_from)
            if date_to:
                qs = qs.filter(history_date__date__lte=date_to)

            for h in qs.select_related('history_user'):
                # django-simple-history appends ' as of [timestamp]' to the string representation.
                # We split it out to give the frontend a clean object name.
                obj_repr = str(h)
                if ' as of ' in obj_repr:
                    obj_repr = obj_repr.split(' as of ')[0]
                    
                all_entries.append({
                    'id':           h.history_id,
                    'model':        model_name,
                    'object_id':    str(h.pk),
                    'object_repr':  obj_repr,
                    'action':       HISTORY_TYPE_MAP.get(h.history_type, h.history_type),
                    'action_raw':   h.history_type,
                    'user':         h.history_user.username if h.history_user else None,
                    'date':         h.history_date.isoformat(),
                    'changes':      _get_diff(h),
                })

        # Sort all entries by date descending
        all_entries.sort(key=operator.itemgetter('date'), reverse=True)

        # Manual pagination
        try:
            page_size = min(int(request.query_params.get('page_size', 50)), 200)
        except (ValueError, TypeError):
            page_size = 50
        try:
            page = max(int(request.query_params.get('page', 1)), 1)
        except (ValueError, TypeError):
            page = 1

        total = len(all_entries)
        start = (page - 1) * page_size
        end   = start + page_size
        results = all_entries[start:end]

        return Response({
            'count':    total,
            'page':     page,
            'pages':    (total + page_size - 1) // page_size if total else 1,
            'results':  results,
            'models':   list(HISTORY_MODELS.keys()),
        })