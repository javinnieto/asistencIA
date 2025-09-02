from django.core.management.base import BaseCommand
from django.utils import timezone
from asistencias.models import InstructorTecno, CursoExtraprogramatico, EstudianteTecno, AsistenciaTecno, EstadoAsistencia
from datetime import date, datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Pobla la base de datos con datos de TecnoAliados'

    def handle(self, *args, **options):
        self.stdout.write('🌱 Poblando TecnoAliados...')

        # 1. Crear Instructores
        instructores_data = [
            {'nombre': 'Dr. Carlos García', 'cargo': 'Instructor Principal', 'especialidad': 'Programación'},
            {'nombre': 'Ing. María Martínez', 'cargo': 'Instructora', 'especialidad': 'Robótica'},
            {'nombre': 'Dra. Ana López', 'cargo': 'Instructora', 'especialidad': 'IA/ML'},
            {'nombre': 'Lic. Roberto Rodríguez', 'cargo': 'Instructor', 'especialidad': 'Desarrollo Web'},
            {'nombre': 'Prof. Laura Sánchez', 'cargo': 'Asistente', 'especialidad': 'Soporte Técnico'}
        ]
        
        instructores = []
        for data in instructores_data:
            instructor, created = InstructorTecno.objects.get_or_create(
                nombre=data['nombre'],
                defaults={
                    'cargo': data['cargo'],
                    'especialidad': data['especialidad'],
                    'email': f"{data['nombre'].lower().replace(' ', '.').replace('dr.', '').replace('ing.', '').replace('dra.', '').replace('lic.', '').replace('prof.', '').strip()}@tecno.com"
                }
            )
            if created:
                self.stdout.write(f'✅ Creado instructor: {instructor.nombre}')
            instructores.append(instructor)

        # 2. Crear Cursos Extraprogramáticos
        cursos_data = [
            {'nombre': 'Programación Python', 'instructor': instructores[0], 'horario': 'Lun-Mié 18:00-20:00'},
            {'nombre': 'Robótica Avanzada', 'instructor': instructores[1], 'horario': 'Mar-Jue 19:00-21:00'},
            {'nombre': 'Inteligencia Artificial', 'instructor': instructores[2], 'horario': 'Vie 16:00-19:00'},
            {'nombre': 'Desarrollo Web', 'instructor': instructores[3], 'horario': 'Sáb 10:00-13:00'}
        ]
        
        cursos = []
        for data in cursos_data:
            curso, created = CursoExtraprogramatico.objects.get_or_create(
                nombre=data['nombre'],
                defaults={
                    'instructor': data['instructor'],
                    'horario': data['horario'],
                    'fechaInicio': date(2025, 3, 1),
                    'fechaFin': date(2025, 12, 15),
                    'descripcion': f"Curso de {data['nombre']} dirigido por {data['instructor'].nombre}"
                }
            )
            if created:
                self.stdout.write(f'✅ Creado curso: {curso.nombre}')
            cursos.append(curso)

        # 3. Crear Estudiantes de TecnoAliados
        estudiantes_nombres = [
            'Juan Pérez', 'María González', 'Carlos Ruiz', 'Ana Silva', 'Luis Torres',
            'Sofia Martín', 'Diego López', 'Camila Torres', 'Andrés Castro', 'Valentina Ruiz'
        ]
        
        estudiantes = []
        for i, nombre in enumerate(estudiantes_nombres):
            curso = random.choice(cursos)
            estudiante, created = EstudianteTecno.objects.get_or_create(
                nombre=nombre,
                curso=curso,
                defaults={
                    'email': f"{nombre.lower().replace(' ', '.')}@estudiante.com",
                    'telefono': f"+1 (555) {random.randint(100, 999)}-{random.randint(1000, 9999)}"
                }
            )
            if created:
                self.stdout.write(f'✅ Creado estudiante: {nombre} - {curso.nombre}')
            estudiantes.append(estudiante)

        # 4. Crear Asistencias de TecnoAliados
        estado_presente, _ = EstadoAsistencia.objects.get_or_create(nombre='Presente')
        estado_ausente, _ = EstadoAsistencia.objects.get_or_create(nombre='Ausente')
        
        # Crear asistencias para los últimos 5 días
        hoy = timezone.now().date()
        
        for dias_atras in range(5):
            fecha = hoy - timedelta(days=dias_atras)
            
            for estudiante in estudiantes:
                # 85% de probabilidad de estar presente
                if random.random() < 0.85:
                    estado = estado_presente
                    temperatura = round(random.uniform(36.0, 37.2), 1)
                    # Horarios según el curso
                    if 'Python' in estudiante.curso.nombre:
                        hora = random.randint(18, 19)
                    elif 'Robótica' in estudiante.curso.nombre:
                        hora = random.randint(19, 20)
                    elif 'IA' in estudiante.curso.nombre:
                        hora = random.randint(16, 18)
                    else:  # Desarrollo Web
                        hora = random.randint(10, 12)
                else:
                    estado = estado_ausente
                    temperatura = None
                    hora = 18  # Hora por defecto
                
                fecha_hora = datetime.combine(fecha, datetime.min.time().replace(hour=hora, minute=random.randint(0, 59)))
                
                AsistenciaTecno.objects.get_or_create(
                    estudiante=estudiante,
                    curso=estudiante.curso,
                    fechaHora=fecha_hora,
                    defaults={
                        'temperatura': temperatura,
                        'estado': estado,
                        'observaciones': 'Registro automático'
                    }
                )

        self.stdout.write(self.style.SUCCESS('🎉 TecnoAliados poblado exitosamente!'))
        self.stdout.write(f'📊 Resumen:')
        self.stdout.write(f'   - Instructores: {InstructorTecno.objects.count()}')
        self.stdout.write(f'   - Cursos: {CursoExtraprogramatico.objects.count()}')
        self.stdout.write(f'   - Estudiantes: {EstudianteTecno.objects.count()}')
        self.stdout.write(f'   - Asistencias: {AsistenciaTecno.objects.count()}')
