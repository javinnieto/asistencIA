from django.contrib import admin
from .models import TipoPersona, Curso, Persona, EstadoAsistencia, Asistencia

@admin.register(TipoPersona)
class TipoPersonaAdmin(admin.ModelAdmin):
    list_display = ['idTipoPersona', 'nombre']
    search_fields = ['nombre']

@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ['idCurso', 'nombre']
    search_fields = ['nombre']

@admin.register(Persona)
class PersonaAdmin(admin.ModelAdmin):
    list_display = ['id', 'apellido', 'nombre', 'tipo', 'curso', 'identificadorFacial', 'nombreTerminal']
    list_filter = ['tipo', 'curso']
    search_fields = ['nombre', 'apellido', 'identificadorFacial', 'nombreTerminal']
    ordering = ['apellido', 'nombre']

@admin.register(EstadoAsistencia)
class EstadoAsistenciaAdmin(admin.ModelAdmin):
    list_display = ['idEstadoAsistencia', 'nombre', 'descripcion']
    search_fields = ['nombre', 'descripcion']

@admin.register(Asistencia)
class AsistenciaAdmin(admin.ModelAdmin):
    list_display = ['idAsistencia', 'persona', 'fecha_hora', 'temperatura', 'estado', 'maskDetect', 'temperatureAlarm', 'verifyResult']
    list_filter = ['estado', 'fecha_hora', 'persona__tipo', 'maskDetect', 'temperatureAlarm']
    search_fields = ['persona__nombre', 'persona__apellido', 'persona__nombreTerminal']
    date_hierarchy = 'fecha_hora'
    ordering = ['-fecha_hora']
