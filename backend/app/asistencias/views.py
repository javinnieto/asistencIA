from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Institucion, TipoPersona, Curso, Persona, PersonaInstitucion, 
    EstadoAsistencia, Asistencia, Horario
)
from .serializers import (
    InstitucionSerializer, TipoPersonaSerializer, CursoSerializer, 
    PersonaSerializer, PersonaInstitucionSerializer, EstadoAsistenciaSerializer, 
    AsistenciaSerializer, PersonaCreateSerializer, PersonaInstitucionCreateSerializer,
    AsistenciaCreateSerializer, TipoPersonaCreateSerializer, CursoCreateSerializer,
    HorarioSerializer, HorarioCreateSerializer
)


class InstitucionViewSet(viewsets.ModelViewSet):
    queryset = Institucion.objects.all()
    serializer_class = InstitucionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']


class TipoPersonaViewSet(viewsets.ModelViewSet):
    queryset = TipoPersona.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['institucion', 'activo']
    search_fields = ['nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TipoPersonaCreateSerializer
        return TipoPersonaSerializer


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['institucion', 'activo']
    search_fields = ['nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CursoCreateSerializer
        return CursoSerializer



class HorarioViewSet(viewsets.ModelViewSet):
    queryset = Horario.objects.all()
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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['nombre', 'idPersona']
    ordering_fields = ['nombre', 'idPersona']
    ordering = ['nombre']

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
        # horarios_data removed: Persona no longer has direct horarios
        
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
                    PersonaInstitucion.objects.create(
                        persona=instance,
                        institucion_id=inst_id,
                        tipo_id=tipo_id,
                        curso_id=curso_id if curso_id else None
                    )
        
        # Retornar el objeto actualizado
        return Response(PersonaSerializer(instance).data)

    def perform_update(self, serializer):
        serializer.save()

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=204)


class PersonaInstitucionViewSet(viewsets.ModelViewSet):
    queryset = PersonaInstitucion.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['persona', 'institucion', 'tipo', 'curso', 'activo']
    search_fields = ['persona__nombre', 'institucion__nombre', 'tipo__nombre', 'curso__nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PersonaInstitucionCreateSerializer
        return PersonaInstitucionSerializer


class EstadoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EstadoAsistencia.objects.all()
    serializer_class = EstadoAsistenciaSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']


class AsistenciaViewSet(viewsets.ModelViewSet):
    queryset = Asistencia.objects.all().select_related('persona', 'estado', 'horario', 'horario__curso').order_by('-fechaHora')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'fechaHora': ['date', 'gte', 'lte'],
        'estado': ['exact'],
        'horario__curso': ['exact'],
        'institucion': ['exact'],
    }
    search_fields = ['persona__nombre']
    ordering_fields = ['fechaHora', 'temperatura']
    ordering = ['-fechaHora']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AsistenciaCreateSerializer
        return AsistenciaSerializer
    
    def perform_update(self, serializer):
        """Recalcular estado y tardanza si se modifica fechaHora"""
        from datetime import timedelta
        from django.utils import timezone
        
        asistencia = self.get_object()
        nueva_fecha_hora = serializer.validated_data.get('fechaHora')
        
        # Si se modificó la hora y tiene horario asignado
        if nueva_fecha_hora and asistencia.horario:
            from asistencias.management.commands.mqtt_listener import ESTADOS_ASISTENCIA
            from datetime import datetime
            
            horario = asistencia.horario
            
            # Convertir a aware datetime si es necesario
            if timezone.is_naive(nueva_fecha_hora):
                nueva_fecha_hora = timezone.make_aware(nueva_fecha_hora)
            
            # Construir datetime del inicio de la clase
            start_dt = datetime.combine(nueva_fecha_hora.date(), horario.hora_inicio)
            start_dt_aware = timezone.make_aware(start_dt)
            
            end_dt = datetime.combine(nueva_fecha_hora.date(), horario.hora_fin)
            end_dt_aware = timezone.make_aware(end_dt)
            
            valid_start = start_dt_aware - timedelta(hours=1)
            valid_end = end_dt_aware
            
            # Verificar si está en rango válido
            if valid_start <= nueva_fecha_hora <= valid_end:
                # Calcular tardanza
                if nueva_fecha_hora > start_dt_aware:
                    diff = nueva_fecha_hora - start_dt_aware
                    minutos_tarde = int(diff.total_seconds() / 60)
                    
                    if minutos_tarde >= 1:
                        estado_nombre = ESTADOS_ASISTENCIA['TARDANZA']
                    else:
                        minutos_tarde = 0
                        estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                else:
                    minutos_tarde = 0
                    estado_nombre = ESTADOS_ASISTENCIA['PRESENTE']
                
                # Actualizar estado
                from asistencias.models import EstadoAsistencia
                estado_obj, _ = EstadoAsistencia.objects.get_or_create(nombre=estado_nombre)
                serializer.validated_data['estado'] = estado_obj
                serializer.validated_data['llegada_tarde_minutos'] = minutos_tarde
            else:
                # Fuera de rango = Ausente
                from asistencias.models import EstadoAsistencia
                estado_obj, _ = EstadoAsistencia.objects.get_or_create(nombre=ESTADOS_ASISTENCIA['AUSENTE'])
                serializer.validated_data['estado'] = estado_obj
                serializer.validated_data['llegada_tarde_minutos'] = 0
        
        serializer.save()