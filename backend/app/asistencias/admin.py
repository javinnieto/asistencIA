from django.contrib import admin
from simple_history.admin import SimpleHistoryAdmin
from .models import Persona, Asistencia, Horario, Institucion, TipoPersona, Curso, EstadoAsistencia, DiaNoLaborable

@admin.register(Persona)
class PersonaAdmin(SimpleHistoryAdmin):
    list_display = ('idPersona', 'nombre', 'email', 'activo')
    search_fields = ('nombre', 'email')

@admin.register(Asistencia)
class AsistenciaAdmin(SimpleHistoryAdmin):
    list_display = ('idAsistencia', 'persona', 'fechaHora', 'tipo', 'estado', 'justificado')
    search_fields = ('persona__nombre',)
    list_filter = ('tipo', 'estado', 'justificado')

@admin.register(Horario)
class HorarioAdmin(SimpleHistoryAdmin):
    list_display = ('idHorario', 'dia', 'hora_inicio', 'hora_fin', 'materia', 'activo')
    list_filter = ('dia', 'activo')

admin.site.register(Institucion)
admin.site.register(TipoPersona)
admin.site.register(Curso)
admin.site.register(EstadoAsistencia)
admin.site.register(DiaNoLaborable)
