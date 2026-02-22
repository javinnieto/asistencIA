from django.test import TestCase
from asistencias.models import Persona, Institucion, TipoPersona, PersonaInstitucion, Asistencia, EstadoAsistencia
from django.utils import timezone
import datetime

class ModelTests(TestCase):
    def setUp(self):
        # Configuración inicial para los tests
        self.institucion = Institucion.objects.create(nombre="Colegio Test", descripcion="Test School")
        self.tipo_profesor = TipoPersona.objects.create(nombre="Profesor", institucion=self.institucion)
        
        self.estado_presente = EstadoAsistencia.objects.create(nombre="Presente", descripcion="Asistio ok")
        
        self.persona = Persona.objects.create(idPersona=123456, nombre="Juan Perez")
        
        # Asignar rol
        PersonaInstitucion.objects.create(
            persona=self.persona, 
            institucion=self.institucion,
            tipo=self.tipo_profesor
        )

    def test_creacion_persona(self):
        """Prueba que se puede crear una persona y obtener su nombre"""
        persona = Persona.objects.get(idPersona=123456)
        self.assertEqual(persona.nombre, "Juan Perez")
        self.assertTrue(persona.activo)

    def test_roles_persona(self):
        """Prueba que se pueden obtener los roles de una persona"""
        roles = self.persona.get_roles()
        self.assertEqual(roles.count(), 1)
        self.assertEqual(roles.first().institucion.nombre, "Colegio Test")

    def test_registro_asistencia(self):
        """Prueba el registro de una asistencia"""
        asistencia = Asistencia.objects.create(
            persona=self.persona,
            fechaHora=timezone.now(),
            temperatura=36.5,
            estado=self.estado_presente,
            institucion=self.institucion
        )
        
        self.assertEqual(asistencia.temperatura, 36.5)
        self.assertEqual(self.persona.total_asistencias, 1)

    def test_necesita_clasificacion(self):
        """Prueba la propiedad necesita_clasificacion"""
        persona_nueva = Persona.objects.create(idPersona=999, nombre="Nuevo")
        self.assertTrue(persona_nueva.necesita_clasificacion)
        
        self.assertFalse(self.persona.necesita_clasificacion)
