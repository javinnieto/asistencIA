from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import TipoPersona, Curso, Persona, EstadoAsistencia, Asistencia
from .serializers import (
    TipoPersonaSerializer, CursoSerializer, PersonaSerializer, 
    EstadoAsistenciaSerializer, AsistenciaSerializer,
    PersonaCreateSerializer, AsistenciaCreateSerializer
)

class TipoPersonaViewSet(viewsets.ModelViewSet):
    queryset = TipoPersona.objects.all()
    serializer_class = TipoPersonaSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre']

class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'curso']
    search_fields = ['nombre', 'idPersona', 'nombreTerminal']
    ordering_fields = ['nombre', 'idPersona']
    ordering = ['nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PersonaCreateSerializer
        return PersonaSerializer

class EstadoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EstadoAsistencia.objects.all()
    serializer_class = EstadoAsistenciaSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']

class AsistenciaViewSet(viewsets.ModelViewSet):
    queryset = Asistencia.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'persona__tipo', 'maskDetect', 'temperatureAlarm']
    search_fields = ['persona__nombre', 'persona__nombreTerminal', 'persona__idPersona']
    ordering_fields = ['fecha_hora', 'temperatura', 'persona__nombre', 'persona__idPersona']
    ordering = ['-fecha_hora']  # Más recientes primero

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AsistenciaCreateSerializer
        return AsistenciaSerializer