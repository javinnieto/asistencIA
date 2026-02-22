from rest_framework.test import APIClient
from django.test import TestCase
from django.contrib.auth.models import User
from asistencias.models import Persona, EstadoAsistencia, Institucion

class ApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser('admin', 'admin@test.com', 'password123')
        self.client.force_authenticate(user=self.user)
        
        self.persona = Persona.objects.create(idPersona=111222, nombre="Api Test User")
        self.estado = EstadoAsistencia.objects.create(nombre="Presente")
        self.institucion = Institucion.objects.create(nombre="Api School")

    def test_get_persona_detail(self):
        """Prueba el endpoint GET /api/personas/{id}/"""
        response = self.client.get(f'/api/personas/{self.persona.idPersona}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['nombre'], "Api Test User")

    def test_crear_asistencia_api(self):
        """Prueba POST /api/asistencias/"""
        data = {
            "persona": self.persona.idPersona,
            "temperatura": 36.6,
            "estado": self.estado.idEstadoAsistencia,
            "institucion": self.institucion.idInstitucion,
            "fechaHora": "2023-01-01T10:00:00Z"
        }
        
        response = self.client.post(
            '/api/asistencias/',
            data,
            format='json'
        )
        self.assertIn(response.status_code, [200, 201])
        self.assertEqual(response.data['temperatura'], 36.6)
