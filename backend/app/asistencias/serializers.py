from rest_framework import serializers
from .models import (
    TipoPersona, Curso, Persona, EstadoAsistencia, Asistencia,
    InstructorTecno, CursoExtraprogramatico, EstudianteTecno, AsistenciaTecno
)

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


# Serializers para TecnoAliados
class InstructorTecnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstructorTecno
        fields = '__all__'


class CursoExtraprogramaticoSerializer(serializers.ModelSerializer):
    instructor = InstructorTecnoSerializer(read_only=True)
    participantes = serializers.ReadOnlyField()  # Campo calculado
    
    class Meta:
        model = CursoExtraprogramatico
        fields = '__all__'


class EstudianteTecnoSerializer(serializers.ModelSerializer):
    curso = CursoExtraprogramaticoSerializer(read_only=True)
    
    class Meta:
        model = EstudianteTecno
        fields = '__all__'


class AsistenciaTecnoSerializer(serializers.ModelSerializer):
    estudiante = EstudianteTecnoSerializer(read_only=True)
    curso = CursoExtraprogramaticoSerializer(read_only=True)
    estado = EstadoAsistenciaSerializer(read_only=True)
    
    class Meta:
        model = AsistenciaTecno
        fields = '__all__'


# Serializers para crear/actualizar TecnoAliados
class CursoExtraprogramaticoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CursoExtraprogramatico
        fields = '__all__'


class EstudianteTecnoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstudianteTecno
        fields = '__all__'


class AsistenciaTecnoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsistenciaTecno
        fields = '__all__'