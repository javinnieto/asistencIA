from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
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


class InstitucionViewSet(viewsets.ModelViewSet):
    queryset = Institucion.objects.all()
    serializer_class = InstitucionSerializer
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']


class TipoPersonaViewSet(viewsets.ModelViewSet):
    queryset = TipoPersona.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['institucion', 'activo']
    search_fields = ['nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TipoPersonaCreateSerializer
        return TipoPersonaSerializer


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['institucion', 'activo']
    search_fields = ['nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CursoCreateSerializer
        return CursoSerializer



class HorarioViewSet(viewsets.ModelViewSet):
    queryset = Horario.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['curso', 'dia', 'activo']
    search_fields = ['materia', 'curso__nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return HorarioCreateSerializer
        return HorarioSerializer
    
    # Propagate logic removed: Schedules are now strictly linked to Cursos.



class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'idPersona']
    ordering_fields = ['nombre', 'idPersona']
    ordering = ['nombre']
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PersonaCreateSerializer
        return PersonaSerializer

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
        serializer.save()

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'No tienes permisos para eliminar personas. Debes ser Administrador.'}, status=403)
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=204)


class PersonaInstitucionViewSet(viewsets.ModelViewSet):
    queryset = PersonaInstitucion.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['persona', 'institucion', 'tipo', 'curso', 'activo']
    search_fields = ['persona__nombre', 'institucion__nombre', 'tipo__nombre', 'curso__nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PersonaInstitucionCreateSerializer
        return PersonaInstitucionSerializer


class EstadoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EstadoAsistencia.objects.all()
    permission_classes = [EsAdminOGuardiaParaEscritura]
    serializer_class = EstadoAsistenciaSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']


class AsistenciaViewSet(viewsets.ModelViewSet):
    queryset = Asistencia.objects.all().select_related('persona', 'estado', 'horario', 'horario__curso').order_by('-fechaHora')
    permission_classes = [EsAdminOGuardiaParaEscritura]
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

        serializer.save()

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

class ConflictoIdentidadViewSet(viewsets.ModelViewSet):
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
        conflicto.save()
        return Response({'status': 'Conflicto ignorado y resuelto'})

    @action(detail=True, methods=['post'])
    def aceptar_cambio(self, request, pk=None):
        """Acepta el nuevo nombre y lo actualiza en la Base de Datos"""
        conflicto = self.get_object()
        persona = conflicto.persona_db
        
        # Guardar historial si se desea (opcional)
        # Actualizar persona
        persona.nombre = conflicto.nombre_recibido
        
        # Si vino foto nueva, actualizarla tmb
        if conflicto.foto_recibida:
            persona.foto = conflicto.foto_recibida
            
        persona.save()
        
        # Marcar conflicto como resuelto
        conflicto.resuelto = True
        conflicto.save()
        
        # Opcional: Resolver todos los conflictos pendientes de esta persona
        ConflictoIdentidad.objects.filter(persona_db=persona, resuelto=False).update(resuelto=True)
        
        return Response({'status': 'nombre actualizado y conflicto resuelto'})

class DiaNoLaborableViewSet(viewsets.ModelViewSet):
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


class ConfiguracionSemanaViewSet(viewsets.ModelViewSet):
    """Gestión de la configuración de Semana A/B (singleton)."""
    queryset = ConfiguracionSemana.objects.all()
    serializer_class = ConfiguracionSemanaSerializer

    @action(detail=False, methods=['get'])
    def actual(self, request):
        """GET /api/configuracion-semana/actual/ → devuelve la semana vigente"""
        semana = ConfiguracionSemana.get_semana_actual()
        config = ConfiguracionSemana.objects.first()
        return Response({
            'semana': semana,
            'fecha_referencia': config.fecha_referencia_semana_a.isoformat() if config else None
        })