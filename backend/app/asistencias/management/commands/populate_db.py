from django.core.management.base import BaseCommand
from django.utils import timezone
from asistencias.models import TipoPersona, Curso, Persona, EstadoAsistencia, Asistencia
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Pobla la base de datos con datos de ejemplo para AsistencIA'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Limpiar datos existentes antes de poblar'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('🧹 Limpiando datos existentes...')
            Asistencia.objects.all().delete()
            Persona.objects.all().delete()
            Curso.objects.all().delete()
            TipoPersona.objects.all().delete()
            EstadoAsistencia.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Datos limpiados'))

        self.stdout.write('🌱 Poblando base de datos...')

        # 1. Crear Tipos de Persona
        tipos_persona = self.create_tipos_persona()
        
        # 2. Crear Cursos
        cursos = self.create_cursos()
        
        # 3. Crear Estados de Asistencia
        estados = self.create_estados_asistencia()
        
        # 4. Crear Personas
        personas = self.create_personas(tipos_persona, cursos)
        
        # 5. Crear Asistencias de ejemplo
        self.create_asistencias_ejemplo(personas, estados)

        self.stdout.write(
            self.style.SUCCESS('🎉 Base de datos poblada exitosamente!')
        )

    def create_tipos_persona(self):
        tipos = [
            {'nombre': 'Estudiante'},
            {'nombre': 'Profesor'},
            {'nombre': 'Personal Administrativo'},
            {'nombre': 'Personal de Mantenimiento'},
            {'nombre': 'Director'}
        ]
        
        tipos_creados = []
        for tipo_data in tipos:
            tipo, created = TipoPersona.objects.get_or_create(
                nombre=tipo_data['nombre']
            )
            if created:
                self.stdout.write(f'✅ Creado tipo: {tipo.nombre}')
            tipos_creados.append(tipo)
        
        return tipos_creados

    def create_cursos(self):
        cursos_primaria = [
            '1er Grado', '2do Grado', '3er Grado', 
            '4to Grado', '5to Grado', '6to Grado', '7mo Grado'
        ]
        
        cursos_secundaria = [
            '1er Año', '2do Año', '3er Año', '4to Año', '5to Año'
        ]
        
        cursos = []
        for curso_nombre in cursos_primaria + cursos_secundaria:
            curso, created = Curso.objects.get_or_create(nombre=curso_nombre)
            if created:
                self.stdout.write(f'✅ Creado curso: {curso.nombre}')
            cursos.append(curso)
        
        return cursos

    def create_estados_asistencia(self):
        estados = [
            {'nombre': 'Presente', 'descripcion': 'Asistió a clase'},
            {'nombre': 'Ausente', 'descripcion': 'No asistió a clase'},
            {'nombre': 'Tardanza', 'descripcion': 'Llegó tarde a clase'},
            {'nombre': 'Justificado', 'descripcion': 'Ausencia justificada'},
            {'nombre': 'Enfermedad', 'descripcion': 'Ausencia por enfermedad'}
        ]
        
        estados_creados = []
        for estado_data in estados:
            estado, created = EstadoAsistencia.objects.get_or_create(
                nombre=estado_data['nombre'],
                defaults={'descripcion': estado_data['descripcion']}
            )
            if created:
                self.stdout.write(f'✅ Creado estado: {estado.nombre}')
            estados_creados.append(estado)
        
        return estados_creados

    def create_personas(self, tipos_persona, cursos):
        # Mapear tipos por nombre
        tipo_estudiante = next(t for t in tipos_persona if t.nombre == 'Estudiante')
        tipo_profesor = next(t for t in tipos_persona if t.nombre == 'Profesor')
        tipo_admin = next(t for t in tipos_persona if t.nombre == 'Personal Administrativo')
        tipo_mantenimiento = next(t for t in tipos_persona if t.nombre == 'Personal de Mantenimiento')
        tipo_director = next(t for t in tipos_persona if t.nombre == 'Director')

        personas = []

        # Estudiantes
        nombres_estudiantes = [
            'María González', 'Juan Pérez', 'Ana Rodríguez', 'Carlos López',
            'Laura Martínez', 'Diego Silva', 'Sofía Torres', 'Miguel Herrera',
            'Valentina Castro', 'Andrés Morales', 'Camila Ruiz', 'Lucas Fernández',
            'Isabella Jiménez', 'Mateo Vargas', 'Emma Castro', 'Santiago Morales'
        ]
        
        for i, nombre in enumerate(nombres_estudiantes, 1):
            curso = random.choice(cursos)
            persona = Persona.objects.create(
                idPersona=1000 + i,
                nombre=nombre,
                tipo=tipo_estudiante,
                curso=curso,
                cantRegistros=0
            )
            personas.append(persona)
            self.stdout.write(f'✅ Creado estudiante: {nombre} - {curso.nombre}')

        # Profesores
        nombres_profesores = [
            'Prof. Carmen Ruiz', 'Prof. Roberto Silva', 'Prof. Elena Martínez',
            'Prof. Pedro Rodríguez', 'Prof. Nora Herrera', 'Prof. Héctor Torres'
        ]
        
        for i, nombre in enumerate(nombres_profesores, 1):
            persona = Persona.objects.create(
                idPersona=2000 + i,
                nombre=nombre,
                tipo=tipo_profesor,
                cantRegistros=0
            )
            personas.append(persona)
            self.stdout.write(f'✅ Creado profesor: {nombre}')

        # Personal Administrativo
        nombres_admin = [
            'Roberto Silva', 'Carmen López', 'Pedro Rodríguez', 'Elena Martínez'
        ]
        
        for i, nombre in enumerate(nombres_admin, 1):
            persona = Persona.objects.create(
                idPersona=3000 + i,
                nombre=nombre,
                tipo=tipo_admin,
                cantRegistros=0
            )
            personas.append(persona)
            self.stdout.write(f'✅ Creado administrativo: {nombre}')

        # Director
        director = Persona.objects.create(
            idPersona=4000,
            nombre='Dr. Carlos García',
            tipo=tipo_director,
            cantRegistros=0
        )
        personas.append(director)
        self.stdout.write(f'✅ Creado director: {director.nombre}')

        return personas

    def create_asistencias_ejemplo(self, personas, estados):
        # Obtener estados por nombre
        presente = next(e for e in estados if e.nombre == 'Presente')
        ausente = next(e for e in estados if e.nombre == 'Ausente')
        tardanza = next(e for e in estados if e.nombre == 'Tardanza')
        
        # Crear asistencias para los últimos 7 días
        hoy = timezone.now().date()
        
        for dias_atras in range(7):
            fecha = hoy - timedelta(days=dias_atras)
            
            for persona in personas:
                # 80% de probabilidad de estar presente
                if random.random() < 0.8:
                    estado = presente
                    temperatura = round(random.uniform(36.0, 37.2), 1)
                    hora = random.randint(7, 8)  # Entre 7:00 y 8:00
                else:
                    if random.random() < 0.3:  # 30% de los ausentes son tardanzas
                        estado = tardanza
                        temperatura = round(random.uniform(36.0, 37.2), 1)
                        hora = random.randint(8, 9)  # Entre 8:00 y 9:00
                    else:
                        estado = ausente
                        temperatura = 0.0
                        hora = 7
                
                fecha_hora = datetime.combine(fecha, datetime.min.time().replace(hour=hora))
                
                asistencia = Asistencia.objects.create(
                    persona=persona,
                    fechaHora=fecha_hora,
                    temperatura=temperatura,
                    estado=estado,
                    maskDetect=random.choice([True, False]),
                    temperatureAlarm=False,
                    verifyResult='success'
                )
                
                # Actualizar contador de registros
                persona.cantRegistros += 1
                persona.save()

        self.stdout.write(f'✅ Creadas asistencias para los últimos 7 días')
