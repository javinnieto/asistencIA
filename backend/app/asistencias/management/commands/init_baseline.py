from django.core.management.base import BaseCommand
from asistencias.models import EstadoAsistencia
from asistencias.constants import ESTADOS_ASISTENCIA

class Command(BaseCommand):
    def handle(self, *args, **options):
        for key, nombre in ESTADOS_ASISTENCIA.items():
            EstadoAsistencia.objects.get_or_create(nombre=nombre)
        self.stdout.write(self.style.SUCCESS('✅ Baseline definitions created (EstadosAsistencia)'))
