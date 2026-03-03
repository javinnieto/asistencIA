from django.core.management.base import BaseCommand
from asistencias.models import EstadoAsistencia, Institucion, TipoPersona
from asistencias.constants import ESTADOS_ASISTENCIA, INSTITUCIONES, TIPOS_ISAE

class Command(BaseCommand):
    help = 'Inicializa los datos base: Estados y los 3 tipos core (Estudiante, Docente, Personal)'

    def handle(self, *args, **options):
        # 1. Estados de Asistencia
        for key, nombre in ESTADOS_ASISTENCIA.items():
            EstadoAsistencia.objects.get_or_create(nombre=nombre)
        self.stdout.write(self.style.SUCCESS('✅ Estados de Asistencia creados'))

        # 2. Institución ISAE
        isae, _ = Institucion.objects.get_or_create(nombre='ISAE')

        # 3. Tipos de Persona Base
        for key, nombre in TIPOS_ISAE.items():
            TipoPersona.objects.get_or_create(nombre=nombre, institucion=isae)
            self.stdout.write(self.style.SUCCESS(f'👤 Tipo de persona "{nombre}" asegurado.'))
        
        self.stdout.write(self.style.SUCCESS('🚀 Baseline completado: Estudiante, Docente, Personal.'))
