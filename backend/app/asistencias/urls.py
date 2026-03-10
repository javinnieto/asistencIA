from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InstitucionViewSet, TipoPersonaViewSet, CursoViewSet, PersonaViewSet, 
    PersonaInstitucionViewSet, EstadoAsistenciaViewSet, AsistenciaViewSet,
    HorarioViewSet, ConflictoIdentidadViewSet, DiaNoLaborableViewSet,
    ConfiguracionSemanaViewSet
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

# URLs de la API
urlpatterns = [
    path('api/', include(router.urls)),
]