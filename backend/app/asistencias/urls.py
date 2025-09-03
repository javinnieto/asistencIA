from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InstitucionViewSet, TipoPersonaViewSet, CursoViewSet, PersonaViewSet, 
    PersonaInstitucionViewSet, EstadoAsistenciaViewSet, AsistenciaViewSet
)

# Crear el router
router = DefaultRouter()
router.register(r'instituciones', InstitucionViewSet)
router.register(r'tipos-persona', TipoPersonaViewSet)
router.register(r'cursos', CursoViewSet)
router.register(r'personas', PersonaViewSet)
router.register(r'persona-institucion', PersonaInstitucionViewSet)
router.register(r'estados-asistencia', EstadoAsistenciaViewSet)
router.register(r'asistencias', AsistenciaViewSet)

# URLs de la API
urlpatterns = [
    path('api/', include(router.urls)),
]