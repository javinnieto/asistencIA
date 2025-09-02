from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoPersonaViewSet, CursoViewSet, PersonaViewSet, 
    EstadoAsistenciaViewSet, AsistenciaViewSet,
    InstructorTecnoViewSet, CursoExtraprogramaticoViewSet,
    EstudianteTecnoViewSet, AsistenciaTecnoViewSet
)

# Crear el router
router = DefaultRouter()
router.register(r'tipos-persona', TipoPersonaViewSet)
router.register(r'cursos', CursoViewSet)
router.register(r'personas', PersonaViewSet)
router.register(r'estados-asistencia', EstadoAsistenciaViewSet)
router.register(r'asistencias', AsistenciaViewSet)

# URLs para TecnoAliados
router.register(r'instructores-tecno', InstructorTecnoViewSet)
router.register(r'cursos-extraprogramaticos', CursoExtraprogramaticoViewSet)
router.register(r'estudiantes-tecno', EstudianteTecnoViewSet)
router.register(r'asistencias-tecno', AsistenciaTecnoViewSet)

# URLs de la API
urlpatterns = [
    path('api/', include(router.urls)),
]