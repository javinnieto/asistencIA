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

    @action(detail=True, methods=['post'])
    def propagate_schedules(self, request, pk=None):
        """
        Propaga los horarios de este curso a todas las personas inscriptas en él.
        Sobreescribe los horarios existentes de las personas.
        """
        curso = self.get_object()
        horarios_curso = curso.horarios.filter(activo=True)
        
        # Encontrar personas asociadas a este curso
        # Buscamos en la tabla intermedia PersonaInstitucion
        roles_curso = PersonaInstitucion.objects.filter(curso=curso, activo=True)
        personas_afectadas = 0
        
        with transaction.atomic():
            for role in roles_curso:
                persona = role.persona
                # Limpiar horarios actuales y asignar los del curso
                persona.horarios.clear()
                persona.horarios.add(*horarios_curso)
                personas_afectadas += 1
                
        return Response({
            'status': 'success',
            'message': f'Horarios propagados a {personas_afectadas} alumnos.',
            'count': personas_afectadas
        })


class HorarioViewSet(viewsets.ModelViewSet):
    queryset = Horario.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['curso', 'dia', 'activo']
    search_fields = ['materia', 'curso__nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return HorarioCreateSerializer
        return HorarioSerializer
    
    def _propagate_to_personas(self, horario):
        """
        Asigna el horario a todas las personas que están inscriptas en el curso.
        """
        # Encontrar personas asociadas a este curso
        roles_curso = PersonaInstitucion.objects.filter(curso=horario.curso, activo=True)
        for role in roles_curso:
            persona = role.persona
            # Agregar el horario si no lo tiene ya
            if not persona.horarios.filter(pk=horario.pk).exists():
                persona.horarios.add(horario)
    
    def perform_create(self, serializer):
        """Al crear un horario, asignarlo automáticamente a todos los alumnos del curso."""
        horario = serializer.save()
        self._propagate_to_personas(horario)
    
    def perform_update(self, serializer):
        """Al actualizar un horario, también propagarlo (por si cambió de curso)."""
        horario = serializer.save()
        self._propagate_to_personas(horario)


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
        
        # Extraer roles y horarios del payload
        roles_data = request.data.pop('roles', None)
        horarios_data = request.data.pop('horarios', None)
        
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
        
        # Sincronizar Horarios si se proporcionan
        if horarios_data is not None:
            # horarios_data debe ser una lista de IDs de horario
            # Limpiar asignaciones previas y asignar nuevas
            instance.horarios.clear()
            for horario_id in horarios_data:
                # Si viene como objeto, tratamos de sacar el ID
                hid = horario_id.get('idHorario') if isinstance(horario_id, dict) else horario_id
                if hid:
                    try:
                        h = Horario.objects.get(pk=hid)
                        instance.horarios.add(h)
                    except Horario.DoesNotExist:
                        pass

        # Retornar el objeto actualizado con sus roles
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
    }
    search_fields = ['persona__nombre']
    ordering_fields = ['fechaHora', 'temperatura']
    ordering = ['-fechaHora']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AsistenciaCreateSerializer
        return AsistenciaSerializer