from django.db import models

# Create your models here.

class TipoPersona(models.Model):
    idTipoPersona = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.nombre

class Curso(models.Model):
    idCurso = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.nombre}"

class Persona(models.Model):
    idPersona = models.IntegerField(primary_key=True)  # Coincide con personId de la terminal
    nombre = models.CharField(max_length=200) # nombre completo
    tipo = models.ForeignKey(TipoPersona, on_delete=models.PROTECT)
    curso = models.ForeignKey(Curso, null=True, blank=True, on_delete=models.SET_NULL)
    cantRegistros = models.IntegerField(default=0) # cantidad de veces que se registró
    nombreTerminal = models.CharField(max_length=100, null=True, blank=True)  # personName del terminal

    def __str__(self):
        if self.nombre:
            return f"{self.nombre} ({self.tipo})"
        elif self.nombreTerminal:
            return f"{self.nombreTerminal} (Terminal)"
        else:
            return f"Persona {self.idPersona}"

class EstadoAsistencia(models.Model):
    idEstadoAsistencia = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(max_length=200, null=True, blank=True)
    

class Asistencia(models.Model):
    idAsistencia = models.AutoField(primary_key=True)
    persona = models.ForeignKey(Persona, on_delete=models.CASCADE)
    fechaHora = models.DateTimeField()
    temperatura = models.FloatField()
    estado = models.ForeignKey(EstadoAsistencia, on_delete=models.PROTECT)
    # Campos adicionales del payload MQTT
    maskDetect = models.BooleanField(null=True, blank=True)
    temperatureAlarm = models.BooleanField(null=True, blank=True)
    verifyResult = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.persona} - {self.fechaHora} - {self.temperatura}°C"


# Modelos para TecnoAliados (cursos extraprogramáticos)
class InstructorTecno(models.Model):
    idInstructor = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    cargo = models.CharField(max_length=100)
    especialidad = models.CharField(max_length=100)
    estado = models.CharField(max_length=20, choices=[('activo', 'Activo'), ('inactivo', 'Inactivo')], default='activo')
    email = models.EmailField(null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.nombre} - {self.especialidad}"


class CursoExtraprogramatico(models.Model):
    idCurso = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    instructor = models.ForeignKey(InstructorTecno, on_delete=models.PROTECT)
    horario = models.CharField(max_length=100)  # Ej: "Lun-Mié 18:00-20:00"
    estado = models.CharField(max_length=20, choices=[('activo', 'Activo'), ('inactivo', 'Inactivo')], default='activo')
    fechaInicio = models.DateField()
    fechaFin = models.DateField()
    descripcion = models.TextField(null=True, blank=True)

    @property
    def participantes(self):
        """Calcula dinámicamente el número de estudiantes activos"""
        return self.estudiantetecno_set.filter(estado='activo').count()

    def __str__(self):
        return f"{self.nombre} - {self.instructor.nombre}"


class EstudianteTecno(models.Model):
    idEstudiante = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    email = models.EmailField(null=True, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    curso = models.ForeignKey(CursoExtraprogramatico, on_delete=models.CASCADE)
    fechaInscripcion = models.DateField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=[('activo', 'Activo'), ('inactivo', 'Inactivo')], default='activo')

    def __str__(self):
        return f"{self.nombre} - {self.curso.nombre}"


class AsistenciaTecno(models.Model):
    idAsistencia = models.AutoField(primary_key=True)
    estudiante = models.ForeignKey(EstudianteTecno, on_delete=models.CASCADE)
    curso = models.ForeignKey(CursoExtraprogramatico, on_delete=models.CASCADE)
    fechaHora = models.DateTimeField()
    temperatura = models.FloatField(null=True, blank=True)
    estado = models.ForeignKey(EstadoAsistencia, on_delete=models.PROTECT)
    observaciones = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.estudiante.nombre} - {self.curso.nombre} - {self.fechaHora}"
