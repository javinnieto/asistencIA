from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Institucion, TipoPersona, Curso, Persona, PersonaInstitucion, 
    EstadoAsistencia, Asistencia
)
from .serializers import (
    InstitucionSerializer, TipoPersonaSerializer, CursoSerializer, 
    PersonaSerializer, PersonaInstitucionSerializer, EstadoAsistenciaSerializer, 
    AsistenciaSerializer, PersonaCreateSerializer, PersonaInstitucionCreateSerializer,
    AsistenciaCreateSerializer, TipoPersonaCreateSerializer, CursoCreateSerializer
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
    queryset = Asistencia.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'persona', 'institucion']
    search_fields = ['persona__nombre', 'persona__idPersona']
    ordering_fields = ['fechaHora', 'temperatura', 'persona__nombre', 'persona__idPersona']
    ordering = ['-fechaHora']  # Más recientes primero

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AsistenciaCreateSerializer
        return AsistenciaSerializer