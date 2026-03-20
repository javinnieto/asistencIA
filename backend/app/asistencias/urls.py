from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InstitucionViewSet, TipoPersonaViewSet, CursoViewSet, PersonaViewSet, 
    PersonaInstitucionViewSet, EstadoAsistenciaViewSet, AsistenciaViewSet,
    HorarioViewSet, ConflictoIdentidadViewSet, DiaNoLaborableViewSet,
    ConfiguracionSemanaViewSet, AuditLogView
)
from .views_usuarios import UsuariosViewSet

# Crear el router
router = DefaultRouter()
router.register(r'instituciones', InstitucionViewSet)
router.register(r'tipos-persona', TipoPersonaViewSet)
router.register(r'cursos', CursoViewSet)
router.register(r'horarios', HorarioViewSet)
router.register(r'personas', PersonaViewSet)
router.register(r'persona-institucion', PersonaInstitucionViewSet)
router.register(r'estados-asistencia', EstadoAsistenciaViewSet)
router.register(r'asistencias', AsistenciaViewSet)
router.register(r'conflictos', ConflictoIdentidadViewSet)
router.register(r'dias-no-laborables', DiaNoLaborableViewSet)
router.register(r'configuracion-semana', ConfiguracionSemanaViewSet)
router.register(r'usuarios', UsuariosViewSet)

from .views_ciclo_lectivo import CicloLectivoView, RevertirCicloLectivoView

# URLs de la API
urlpatterns = [
    path('api/', include(router.urls)),
    path('api/audit-log/', AuditLogView.as_view(), name='audit-log'),
    path('api/sistema/avanzar-anio/', CicloLectivoView.as_view(), name='avanzar-anio'),
    path('api/sistema/revertir-anio/', RevertirCicloLectivoView.as_view(), name='revertir-anio'),
]