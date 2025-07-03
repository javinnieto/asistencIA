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
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    tipo = models.ForeignKey(TipoPersona, on_delete=models.PROTECT)
    curso = models.ForeignKey(Curso, null=True, blank=True, on_delete=models.SET_NULL)
    identificadorFacial = models.CharField(max_length=100, unique=True)
    nombreTerminal = models.CharField(max_length=100, null=True, blank=True)  # personName del terminal

    def __str__(self):
        if self.nombre and self.apellido:
            return f"{self.apellido}, {self.nombre} ({self.tipo})"
        elif self.nombreTerminal:
            return f"{self.nombreTerminal} (Terminal)"
        else:
            return f"Persona {self.identificadorFacial}"

class EstadoAsistencia(models.Model):
    idEstadoAsistencia = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(max_length=200, null=True, blank=True)
    

class Asistencia(models.Model):
    idAsistencia = models.AutoField(primary_key=True)
    persona = models.ForeignKey(Persona, on_delete=models.CASCADE)
    fecha_hora = models.DateTimeField()
    temperatura = models.FloatField()
    estado = models.ForeignKey(EstadoAsistencia, on_delete=models.PROTECT)
    # Campos adicionales del payload MQTT
    maskDetect = models.BooleanField(null=True, blank=True)
    temperatureAlarm = models.BooleanField(null=True, blank=True)
    verifyResult = models.CharField(max_length=20, null=True, blank=True)

    def __str__(self):
        return f"{self.persona} - {self.fecha_hora} - {self.temperatura}°C"
