from django.db import models


class Institucion(models.Model):
    """Instituciones del sistema"""
    idInstitucion = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(null=True, blank=True)
    activa = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class TipoPersona(models.Model):
    """Tipos de persona por institución"""
    idTipoPersona = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    institucion = models.ForeignKey(Institucion, on_delete=models.CASCADE, related_name='tipos_persona')
    activo = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['nombre', 'institucion']
    
    def __str__(self):
        return f"{self.nombre} ({self.institucion.nombre})"


class Curso(models.Model):
    """Cursos/Grados por institución"""
    idCurso = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    institucion = models.ForeignKey(Institucion, on_delete=models.CASCADE, related_name='cursos')
    activo = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['nombre', 'institucion']
    
    def __str__(self):
        return f"{self.nombre} ({self.institucion.nombre})"


class Persona(models.Model):
    """Persona del sistema - completamente genérica"""
    idPersona = models.IntegerField(primary_key=True)
    nombre = models.CharField(max_length=200)
    foto = models.ImageField(upload_to='personas/', null=True, blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre
    
    @property
    def total_asistencias(self):
        """Calcula dinámicamente el total de asistencias"""
        return self.asistencia_set.count()
    
    def get_roles(self):
        """Obtiene todos los roles de la persona en todas las instituciones"""
        return PersonaInstitucion.objects.filter(persona=self, activo=True)
    
    def get_rol_en_institucion(self, nombre_institucion):
        """Obtiene el rol en una institución específica"""
        try:
            return PersonaInstitucion.objects.get(
                persona=self,
                institucion__nombre=nombre_institucion,
                activo=True
            )
        except PersonaInstitucion.DoesNotExist:
            return None
    
    def agregar_rol(self, institucion, tipo, curso=None):
        """Agrega un rol en una institución"""
        return PersonaInstitucion.objects.create(
            persona=self,
            institucion=institucion,
            tipo=tipo,
            curso=curso
        )
    
    @property
    def necesita_clasificacion(self):
        """Indica si necesita clasificación"""
        return not self.get_roles().exists()


class PersonaInstitucion(models.Model):
    """Tabla intermedia: relaciona personas con instituciones y sus roles"""
    idPersonaInstitucion = models.AutoField(primary_key=True)
    persona = models.ForeignKey(Persona, on_delete=models.CASCADE, related_name='roles')
    institucion = models.ForeignKey(Institucion, on_delete=models.CASCADE)
    tipo = models.ForeignKey(TipoPersona, on_delete=models.PROTECT)
    curso = models.ForeignKey(Curso, null=True, blank=True, on_delete=models.SET_NULL)
    activo = models.BooleanField(default=True)
    fecha_ingreso = models.DateField(auto_now_add=True)
    
    class Meta:
        unique_together = ['persona', 'institucion', 'tipo', 'curso']
    
    def __str__(self):
        curso_info = f" - {self.curso.nombre}" if self.curso else ""
        return f"{self.persona.nombre}: {self.tipo.nombre} en {self.institucion.nombre}{curso_info}"


class EstadoAsistencia(models.Model):
    idEstadoAsistencia = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(max_length=200, null=True, blank=True)
    
    def __str__(self):
        return self.nombre


class Asistencia(models.Model):
    """Asistencia unificada para todas las instituciones"""
    idAsistencia = models.AutoField(primary_key=True)
    persona = models.ForeignKey(Persona, on_delete=models.CASCADE)
    fechaHora = models.DateTimeField()
    temperatura = models.FloatField()
    estado = models.ForeignKey(EstadoAsistencia, on_delete=models.PROTECT)
    # Opcional: especificar para qué institución/contexto es la asistencia
    institucion = models.ForeignKey(Institucion, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.persona} - {self.fechaHora} - {self.temperatura}°C"