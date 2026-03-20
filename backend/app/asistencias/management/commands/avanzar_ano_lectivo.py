from django.core.management.base import BaseCommand
from django.db import transaction
from asistencias.models import PersonaInstitucion, Curso

class Command(BaseCommand):
    help = 'Avanza a los estudiantes de la institución ISAE al siguiente grado/año lectivo.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--commit',
            action='store_true',
            help='Ejecuta los cambios en la base de datos (si no se proporciona, solo hace una simulación/Dry-Run).',
        )

    def handle(self, *args, **options):
        commit = options['commit']

        if not commit:
            self.stdout.write(self.style.WARNING('⚠️ MODO SIMULACIÓN (Dry-Run). No se guardarán los cambios. Usa --commit para aplicar.'))

        # Mapa de transición de cursos para la institución ISAE
        MAPPING_CURSOS = {
            # Primaria
            '1er grado': '2do grado',
            '2do grado': '3er grado',
            '3er grado': '4to grado',
            '4to grado': '5to grado',
            '5to grado': '6to grado',
            '6to grado': '7mo grado',
            '7mo grado': None, # Egreso Primaria -> Deben elegir especialidad manualmente
            
            # Secundaria - Ciencias Naturales
            '1er año (cs naturales)': '2do año (cs naturales)',
            '2do año (cs naturales)': '3er año (cs naturales)',
            '3er año (cs naturales)': '4to año (cs naturales)',
            '4to año (cs naturales)': '5to año (cs naturales)',
            '5to año (cs naturales)': None, # Egreso Secundaria
            
            # Secundaria - Informática
            '1er año (informática)': '2do año (informática)',
            '2do año (informática)': '3er año (informática)',
            '3er año (informática)': '4to año (informática)',
            '4to año (informática)': '5to año (informática)',
            '5to año (informática)': None, # Egreso Secundaria
        }

        # Asegurarnos de que los cursos de destino existen en ISAE
        cursos_destino_nombres = set(filter(None, MAPPING_CURSOS.values()))
        cursos_destino_objs = {}
        
        self.stdout.write(f'Asegurando que los cursos destino existen en ISAE...')
        for nombre in cursos_destino_nombres:
            try:
                # Buscamos ignorando mayúsculas/minúsculas para ser más seguros
                # Pero normalmente el nombre es exacto
                curso = Curso.objects.get(nombre__iexact=nombre, institucion__nombre__iexact='ISAE', activo=True)
                cursos_destino_objs[nombre.lower()] = curso
            except Curso.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'❌ Error: No se encontró el curso de destino "{nombre}" en ISAE. Debes crearlo primero.'))
                return
            except Curso.MultipleObjectsReturned:
                self.stdout.write(self.style.ERROR(f'❌ Error: Hay múltiples cursos llamados "{nombre}" en ISAE.'))
                return

        # Obtenemos todos los roles activos de estudiantes en ISAE que tengan un curso asignado
        estudiantes_isae = PersonaInstitucion.objects.filter(
            institucion__nombre__iexact='ISAE',
            tipo__nombre__iexact='Estudiante',
            activo=True,
            curso__isnull=False
        )

        total_procesados = 0
        total_avanzados = 0
        total_egresados = 0
        total_ignorados = 0

        self.stdout.write(f'🔍 Se encontraron {estudiantes_isae.count()} estudiantes con curso en ISAE.')

        with transaction.atomic():
            for rol in estudiantes_isae:
                curso_actual = rol.curso.nombre.strip().lower()
                next_curso_name = None
                
                # Buscar correspondencia en el MAPPING incase-sensitive
                for from_course, to_course in MAPPING_CURSOS.items():
                    if from_course.lower() == curso_actual:
                        next_curso_name = to_course
                        break
                else:
                    # El curso actual no está en el mapa (ej. cursillo especial, error ortográfico)
                    self.stdout.write(self.style.WARNING(f'⏭️  Ignorado: {rol.persona.nombre} está en "{rol.curso.nombre}" (Curso no reconocido en la ruta estándar).'))
                    total_ignorados += 1
                    continue

                total_procesados += 1

                if next_curso_name is None:
                    # Egreso (7mo grado o 5to año)
                    self.stdout.write(self.style.SUCCESS(f'🎓 Egreso: {rol.persona.nombre} terminó "{rol.curso.nombre}". Queda sin curso asignado.'))
                    if commit:
                        rol.curso = None
                        rol.save()
                    total_egresados += 1
                else:
                    # Avance normal
                    next_curso_obj = cursos_destino_objs.get(next_curso_name.lower())
                    self.stdout.write(self.style.SUCCESS(f'➡️  Avance: {rol.persona.nombre} pasa de "{rol.curso.nombre}" a "{next_curso_obj.nombre}".'))
                    if commit:
                        rol.curso = next_curso_obj
                        rol.save()
                    total_avanzados += 1

        self.stdout.write(self.style.SUCCESS('=========================================='))
        self.stdout.write(self.style.SUCCESS(f'📊 RESUMEN {"(SIMULACIÓN)" if not commit else "(APLICADO)"}'))
        self.stdout.write(self.style.SUCCESS(f'👥 Total procesados válidos: {total_procesados}'))
        self.stdout.write(self.style.SUCCESS(f'📈 Avanzaron de curso: {total_avanzados}'))
        self.stdout.write(self.style.SUCCESS(f'🎓 Egresaron (sin curso): {total_egresados}'))
        self.stdout.write(self.style.SUCCESS(f'⏭️  Ignorados (curso no en ruta): {total_ignorados}'))
        self.stdout.write(self.style.SUCCESS('=========================================='))
