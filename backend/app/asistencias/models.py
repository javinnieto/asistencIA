from django.db import models
from simple_history.models import HistoricalRecords


class Institucion(models.Model):
    """Instituciones del sistema"""
    idInstitucion = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(null=True, blank=True)
    activa = models.BooleanField(default=True)
    history = HistoricalRecords()

    def __str__(self):
        return self.nombre


class TipoPersona(models.Model):
    """Tipos de persona por institución"""
    idTipoPersona = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    institucion = models.ForeignKey(Institucion, on_delete=models.CASCADE, related_name='tipos_persona')
    activo = models.BooleanField(default=True)
    history = HistoricalRecords()
    
    class Meta:
        unique_together = ['nombre', 'institucion']
    
    def __str__(self):
        return f"{self.nombre} ({self.institucion.nombre})"


class Curso(models.Model):
    """Cursos/Grados por institución"""
    idCurso = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    institucion = models.ForeignKey(Institucion, on_delete=models.CASCADE, related_name='cursos')
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    activo = models.BooleanField(default=True)
    history = HistoricalRecords()
    
    class Meta:
        unique_together = ['nombre', 'institucion']
    
    def __str__(self):
        return f"{self.nombre} ({self.institucion.nombre})"



class Horario(models.Model):
    """Horarios de cursada"""
    DIAS_SEMANA = [
        ('Lunes', 'Lunes'),
        ('Martes', 'Martes'),
        ('Miércoles', 'Miércoles'),
        ('Jueves', 'Jueves'),
        ('Viernes', 'Viernes'),
        ('Sábado', 'Sábado'),
        ('Domingo', 'Domingo'),
    ]

    SEMANAS = [
        ('Todas', 'Todas'),
        ('A', 'Semana A'),
        ('B', 'Semana B'),
    ]

    idHorario = models.AutoField(primary_key=True)
    curso = models.ForeignKey(Curso, null=True, blank=True, on_delete=models.CASCADE, related_name='horarios')
    persona_institucion = models.ForeignKey('PersonaInstitucion', null=True, blank=True, on_delete=models.CASCADE, related_name='horarios_personalizados')
    dia = models.CharField(max_length=20, choices=DIAS_SEMANA)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    materia = models.CharField(max_length=100, null=True, blank=True)
    activo = models.BooleanField(default=True)
    semana = models.CharField(max_length=5, choices=SEMANAS, default='Todas')
    history = HistoricalRecords()

    def __str__(self):
        semana_str = f' [{self.semana}]' if self.semana != 'Todas' else ''
        return f"{self.curso} - {self.dia} {self.hora_inicio}-{self.hora_fin}{semana_str}"


class Persona(models.Model):
    """Persona del sistema - completamente genérica"""
    # Tipos core: 'Estudiante', 'Docente', 'Personal'
    
    idPersona = models.IntegerField(primary_key=True)
    nombre = models.CharField(max_length=200)
    email = models.EmailField(max_length=254, null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    telefono_emergencia = models.CharField(max_length=20, null=True, blank=True)
    foto = models.TextField(null=True, blank=True)  # Stores Base64 strings or URLs from MQTT
    activo = models.BooleanField(default=True)
    requiere_salida = models.BooleanField(default=True) # Default True for most people (Docente/Personal)
    history = HistoricalRecords()
    
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
    history = HistoricalRecords()
    
    class Meta:
        unique_together = ['persona', 'institucion', 'tipo', 'curso']
    
    def __str__(self):
        curso_info = f" - {self.curso.nombre}" if self.curso else ""
        return f"{self.persona.nombre}: {self.tipo.nombre} en {self.institucion.nombre}{curso_info}"


class EstadoAsistencia(models.Model):
    idEstadoAsistencia = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(max_length=200, null=True, blank=True)
    history = HistoricalRecords()
    
    def __str__(self):
        return self.nombre


class Asistencia(models.Model):
    """Asistencia unificada para todas las instituciones"""
    idAsistencia = models.AutoField(primary_key=True)
    persona = models.ForeignKey(Persona, on_delete=models.CASCADE)
    fechaHora = models.DateTimeField()
    tipo = models.CharField(max_length=10, choices=[('Entrada', 'Entrada'), ('Salida', 'Salida')], default='Entrada')
    temperatura = models.FloatField()
    estado = models.ForeignKey(EstadoAsistencia, on_delete=models.PROTECT)
    # Opcional: especificar para qué institución/contexto es la asistencia
    institucion = models.ForeignKey(Institucion, null=True, blank=True, on_delete=models.SET_NULL)
    # New fields for strict logic
    horario = models.ForeignKey(Horario, null=True, blank=True, on_delete=models.SET_NULL)
    llegada_tarde_minutos = models.IntegerField(default=0)
    salida_temprano_minutos = models.IntegerField(default=0)
    foto = models.TextField(null=True, blank=True) # Foto del momento de la asistencia
    justificado = models.BooleanField(default=False, help_text="Si es verdadero, la falta/tardanza cuenta como presente en las estadísticas")
    history = HistoricalRecords()

    def __str__(self):
        return f"{self.persona} - {self.fechaHora} - {self.temperatura}°C"

class ConflictoIdentidad(models.Model):
    """Registro de conflictos cuando el dispositivo envía un ID que ya existe pero con otro nombre (posible suplantación o error)"""
    idConflicto = models.AutoField(primary_key=True)
    persona_db = models.ForeignKey(Persona, on_delete=models.CASCADE, related_name='conflictos')
    nombre_recibido = models.CharField(max_length=200)
    fechaHora = models.DateTimeField(auto_now_add=True)
    foto_recibida = models.TextField(null=True, blank=True)
    resuelto = models.BooleanField(default=False)
    history = HistoricalRecords()

    def __str__(self):
        return f"Conflicto {self.idConflicto}: ID {self.persona_db.idPersona} (DB: {self.persona_db.nombre} vs Recibido: {self.nombre_recibido})"

class DiaNoLaborable(models.Model):
    """Días en los que no se espera asistencia (Feriados, Jornadas, etc.)"""
    idDia = models.AutoField(primary_key=True)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True, help_text="Si es nulo, aplica sólo a fecha_inicio")
    motivo = models.CharField(max_length=200)
    institucion = models.ForeignKey(Institucion, on_delete=models.CASCADE)
    aplica_a_todos = models.BooleanField(default=True, help_text="Si es verdadero, aplica a toda la institución")
    history = HistoricalRecords()
    
    # Relaciones para cuando aplica_a_todos es False
    cursos_afectados = models.ManyToManyField(Curso, blank=True)
    tipos_persona_afectados = models.ManyToManyField(TipoPersona, blank=True)
    personas_afectadas = models.ManyToManyField(Persona, blank=True)

    def __str__(self):
        rango = f"{self.fecha_inicio}"
        if self.fecha_fin and self.fecha_fin != self.fecha_inicio:
            rango += f" → {self.fecha_fin}"
        return f"{rango} - {self.motivo} ({self.institucion.nombre})"


class ConfiguracionSemana(models.Model):
    """Singleton: define qué semana (A/B) está vigente basado en una fecha de referencia"""
    fecha_referencia_semana_a = models.DateField(
        help_text="Una fecha conocida que cae en Semana A. El sistema calcula automáticamente si la semana actual es A o B."
    )
    history = HistoricalRecords()

    class Meta:
        verbose_name = 'Configuración de Semana'
        verbose_name_plural = 'Configuración de Semana'

    def __str__(self):
        return f"Referencia Semana A: {self.fecha_referencia_semana_a}"

    @staticmethod
    def get_semana_actual(fecha=None):
        """Calcula si la fecha dada (o hoy) es Semana A o B.
        Retorna 'A' o 'B'.
        Si no hay configuración, retorna 'A' por defecto."""
        from datetime import date
        if fecha is None:
            fecha = date.today()
        try:
            config = ConfiguracionSemana.objects.first()
            if not config:
                return 'A'
            ref = config.fecha_referencia_semana_a
            # Diferencia en semanas ISO
            diff_weeks = (fecha.isocalendar()[1] - ref.isocalendar()[1]) + \
                         52 * (fecha.isocalendar()[0] - ref.isocalendar()[0])
            return 'A' if diff_weeks % 2 == 0 else 'B'
        except Exception:
            return 'A'