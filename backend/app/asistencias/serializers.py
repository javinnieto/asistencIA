from rest_framework import serializers
from .models import (
    Institucion, TipoPersona, Curso, Persona, PersonaInstitucion, 
    EstadoAsistencia, Asistencia, Horario
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



class HorarioSerializer(serializers.ModelSerializer):
    curso = serializers.SerializerMethodField()
    
    def get_curso(self, obj):
        # Return simple curso data to avoid recursion depth issues or cyclical dependency
        try:
            return {
                "idCurso": obj.curso.idCurso,
                "nombre": obj.curso.nombre
            }
        except:
            return None
    
    class Meta:
        model = Horario
        fields = '__all__'


class CursoSerializer(serializers.ModelSerializer):
    institucion = InstitucionSerializer(read_only=True)
    horarios = HorarioSerializer(many=True, read_only=True)
    
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
    horarios = HorarioSerializer(many=True, read_only=True)
    total_asistencias = serializers.ReadOnlyField()
    necesita_clasificacion = serializers.ReadOnlyField()
    
    class Meta:
        model = Persona
        fields = ['idPersona', 'nombre', 'email', 'telefono', 'telefono_emergencia', 'foto', 'activo', 'roles', 'horarios', 'total_asistencias', 'necesita_clasificacion']


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
    """Serializer para crear/editar personas (solo datos básicos)"""
    idPersona = serializers.IntegerField(required=False)  # Optional for updates
    
    class Meta:
        model = Persona
        fields = ['idPersona', 'nombre', 'email', 'telefono', 'telefono_emergencia', 'foto', 'activo', 'horarios']


class PersonaInstitucionCreateSerializer(serializers.ModelSerializer):
    def validate(self, data):
        """Validar que curso sea obligatorio"""
        if not data.get('curso'):
            raise serializers.ValidationError({
                'curso': 'El curso es obligatorio. Una persona debe estar asignada a un curso específico.'
            })
        return data
    
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
    horarios = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Lista de horarios para el curso (mínimo 1)"
    )
    
    def validate_horarios(self, value):
        """Validar que haya al menos un horario si se proporciona"""
        if value is not None and len(value) == 0:
            raise serializers.ValidationError(
                'Debe proporcionar al menos un horario para el curso si envía este campo.'
            )
        return value
    
    def create(self, validated_data):
        """Crear curso con sus horarios"""
        horarios_data = validated_data.pop('horarios', [])
        curso = Curso.objects.create(**validated_data)
        
        # Crear los horarios asociados
        if horarios_data:
            for horario_data in horarios_data:
                Horario.objects.create(curso=curso, **horario_data)
        
        return curso
    
    class Meta:
        model = Curso
        fields = ['idCurso', 'nombre', 'institucion', 'fecha_inicio', 'fecha_fin', 'activo', 'horarios']


class HorarioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Horario
        fields = '__all__'