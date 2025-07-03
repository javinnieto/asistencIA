from rest_framework import serializers
from .models import TipoPersona, Curso, Persona, EstadoAsistencia, Asistencia

class TipoPersonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPersona
        fields = '__all__'

class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = '__all__'

class PersonaSerializer(serializers.ModelSerializer):
    tipo = TipoPersonaSerializer(read_only=True)
    curso = CursoSerializer(read_only=True)
    
    class Meta:
        model = Persona
        fields = '__all__'

class EstadoAsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoAsistencia
        fields = '__all__'

class AsistenciaSerializer(serializers.ModelSerializer):
    persona = PersonaSerializer(read_only=True)
    estado = EstadoAsistenciaSerializer(read_only=True)
    
    class Meta:
        model = Asistencia
        fields = '__all__'

# Serializers para crear/actualizar (sin relaciones anidadas)
class PersonaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Persona
        fields = '__all__'

class AsistenciaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asistencia
        fields = '__all__'