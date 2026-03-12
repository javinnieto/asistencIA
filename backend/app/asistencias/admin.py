from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import (
    Persona, Asistencia, Horario, Institucion, TipoPersona, 
    Curso, EstadoAsistencia, DiaNoLaborable, ConflictoIdentidad,
    ConfiguracionSemana, PersonaInstitucion
)

class PersonaInstitucionAdmin(SimpleHistoryAdmin):
    list_display = ('persona', 'institucion', 'tipo', 'curso', 'activo')
    list_filter = ('institucion', 'tipo', 'activo')

class PersonaAdmin(SimpleHistoryAdmin):
    list_display = ('idPersona', 'nombre', 'email', 'activo')
    search_fields = ('nombre', 'email')

class AsistenciaAdmin(SimpleHistoryAdmin):
    list_display = ('idAsistencia', 'persona', 'fechaHora', 'tipo', 'estado', 'justificado')
    search_fields = ('persona__nombre',)
    list_filter = ('tipo', 'estado', 'justificado')

class HorarioAdmin(SimpleHistoryAdmin):
    list_display = ('idHorario', 'dia', 'hora_inicio', 'hora_fin', 'materia', 'activo')
    list_filter = ('dia', 'activo')

class CursoAdmin(SimpleHistoryAdmin):
    list_display = ('idCurso', 'nombre', 'institucion', 'activo')
    list_filter = ('institucion', 'activo')

class InstitucionAdmin(SimpleHistoryAdmin):
    list_display = ('idInstitucion', 'nombre', 'activa')

class TipoPersonaAdmin(SimpleHistoryAdmin):
    list_display = ('idTipoPersona', 'nombre', 'activo')

class EstadoAsistenciaAdmin(SimpleHistoryAdmin):
    list_display = ('idEstadoAsistencia', 'nombre')

class DiaNoLaborableAdmin(SimpleHistoryAdmin):
    list_display = ('idDia', 'fecha_inicio', 'motivo', 'institucion')

class ConflictoIdentidadAdmin(SimpleHistoryAdmin):
    list_display = ('idConflicto', 'persona_db', 'nombre_recibido', 'fechaHora', 'resuelto')

class ConfiguracionSemanaAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'fecha_referencia_semana_a')

# Registration
admin.site.register(Persona, PersonaAdmin)
admin.site.register(Asistencia, AsistenciaAdmin)
admin.site.register(Horario, HorarioAdmin)
admin.site.register(Curso, CursoAdmin)
admin.site.register(Institucion, InstitucionAdmin)
admin.site.register(TipoPersona, TipoPersonaAdmin)
admin.site.register(EstadoAsistencia, EstadoAsistenciaAdmin)
admin.site.register(DiaNoLaborable, DiaNoLaborableAdmin)
admin.site.register(ConflictoIdentidad, ConflictoIdentidadAdmin)
admin.site.register(ConfiguracionSemana, ConfiguracionSemanaAdmin)
admin.site.register(PersonaInstitucion, PersonaInstitucionAdmin)
