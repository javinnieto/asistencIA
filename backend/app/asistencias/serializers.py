from rest_framework import serializers
from .models import (
    Institucion, TipoPersona, Curso, Persona, PersonaInstitucion, 
    EstadoAsistencia, Asistencia
)


class InstitucionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institucion
        fields = '__all__'


class TipoPersonaSerializer(serializers.ModelSerializer):
    institucion = InstitucionSerializer(read_only=True)
    
    class Meta:
        model = TipoPersona
        fields = '__all__'


class CursoSerializer(serializers.ModelSerializer):
    institucion = InstitucionSerializer(read_only=True)
    
    class Meta:
        model = Curso
        fields = '__all__'


class PersonaInstitucionSerializer(serializers.ModelSerializer):
    institucion = InstitucionSerializer(read_only=True)
    tipo = TipoPersonaSerializer(read_only=True)
    curso = CursoSerializer(read_only=True)
    
    class Meta:
        model = PersonaInstitucion
        fields = '__all__'


class PersonaSerializer(serializers.ModelSerializer):
    roles = PersonaInstitucionSerializer(many=True, read_only=True)
    total_asistencias = serializers.ReadOnlyField()
    necesita_clasificacion = serializers.ReadOnlyField()
    
    class Meta:
        model = Persona
        fields = ['idPersona', 'nombre', 'foto', 'activo', 'roles', 'total_asistencias', 'necesita_clasificacion']


class EstadoAsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoAsistencia
        fields = '__all__'


class AsistenciaSerializer(serializers.ModelSerializer):
    persona = PersonaSerializer(read_only=True)
    estado = EstadoAsistenciaSerializer(read_only=True)
    institucion = InstitucionSerializer(read_only=True)
    
    class Meta:
        model = Asistencia
        fields = '__all__'


# Serializers para crear/actualizar (sin relaciones anidadas)
class PersonaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Persona
        fields = ['idPersona', 'nombre', 'foto', 'activo']


class PersonaInstitucionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonaInstitucion
        fields = '__all__'


class AsistenciaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asistencia
        fields = '__all__'


class TipoPersonaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPersona
        fields = '__all__'


class CursoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = '__all__'