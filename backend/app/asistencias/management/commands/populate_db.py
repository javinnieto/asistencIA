from django.core.management.base import BaseCommand
from django.utils import timezone
from asistencias.models import (
    Institucion, TipoPersona, Curso, Persona, PersonaInstitucion, 
    EstadoAsistencia, Asistencia, Horario
)
from datetime import datetime, timedelta, time
import random

class Command(BaseCommand):
    help = 'Pobla la base de datos con datos de ejemplo para AsistencIA (V2)'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Limpiar datos existentes antes de poblar')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('🧹 Limpiando datos existentes...')
            Asistencia.objects.all().delete()
            Horario.objects.all().delete()
            PersonaInstitucion.objects.all().delete()
            Persona.objects.all().delete()
            Curso.objects.all().delete()
            TipoPersona.objects.all().delete()
            Institucion.objects.all().delete()
            EstadoAsistencia.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Datos limpiados'))

        self.stdout.write('🌱 Poblando base de datos...')

        # 1. Crear Instituciones
        isae, _ = Institucion.objects.get_or_create(nombre='ISAE', defaults={'descripcion': 'Instituto Superior', 'activa': True})
        tecno, _ = Institucion.objects.get_or_create(nombre='TecnoAliados', defaults={'descripcion': 'Academia de Tecnología', 'activa': True})

        # 2. Tipos de Persona
        estudiante_isae, _ = TipoPersona.objects.get_or_create(nombre='Estudiante')
        profesor_isae, _ = TipoPersona.objects.get_or_create(nombre='Docente')
        
        no_docente_tecno, _ = TipoPersona.objects.get_or_create(nombre='No Docente')

        # 3. Cursos
        cursos_isae = []
        for grado in ['1er Año', '2do Año', '3er Año', '4to Año', '5to Año']:
            c, _ = Curso.objects.get_or_create(nombre=grado, institucion=isae, defaults={'activo': True})
            cursos_isae.append(c)

        curso_python, _ = Curso.objects.get_or_create(nombre='Python Full Stack', institucion=tecno, defaults={'activo': True})
        curso_react, _ = Curso.objects.get_or_create(nombre='React Avanzado', institucion=tecno, defaults={'activo': True})

        # 4. Horarios (NUEVO)
        self.stdout.write('🕒 Creando horarios...')
        dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
        
        # Horarios para ISAE (Turno mañana)
        for curso in cursos_isae:
            # Crear 3 bloques por día para cada curso
            for dia in dias:
                Horario.objects.get_or_create(
                    curso=curso, dia=dia, hora_inicio=time(8, 0), hora_fin=time(9, 0), 
                    defaults={'activo': True}
                )
                Horario.objects.get_or_create(
                    curso=curso, dia=dia, hora_inicio=time(9, 15), hora_fin=time(10, 15), 
                    defaults={'activo': True}
                )

        # Horarios para Tecno (Turno noche)
        for curso in [curso_python, curso_react]:
            for dia in ['Martes', 'Jueves']:
                Horario.objects.get_or_create(
                    curso=curso, dia=dia, hora_inicio=time(19, 0), hora_fin=time(22, 0), 
                    defaults={'activo': True}
                )

        # 5. Estados
        presente, _ = EstadoAsistencia.objects.get_or_create(nombre='Presente')
        ausente, _ = EstadoAsistencia.objects.get_or_create(nombre='Ausente')
        tarde, _ = EstadoAsistencia.objects.get_or_create(nombre='Tardanza')

        # 6. Personas
        self.stdout.write('👥 Creando personas...')
        
        # User Javinnieto
        javier, _ = Persona.objects.get_or_create(idPersona=47, defaults={'nombre': 'Javier Nieto', 'activo': True})
        # Rol en ISAE
        PersonaInstitucion.objects.get_or_create(persona=javier, institucion=isae, tipo=estudiante_isae, curso=cursos_isae[4])
        
        # Generar estudiantes random
        nombres = ['Ana', 'Luis', 'Carlos', 'María', 'Pedro', 'Sofía', 'Lucía', 'Jorge', 'Elena', 'Miguel']
        apellidos = ['García', 'López', 'Martínez', 'Rodríguez', 'Sánchez', 'Pérez', 'Gómez', 'Fernández']
        
        estudiantes_creados = [javier]
        
        # 30 estudiantes para ISAE
        for i in range(1, 31):
            if i == 47: continue # Skip javier
            nombre = f"{random.choice(nombres)} {random.choice(apellidos)}"
            p, _ = Persona.objects.get_or_create(idPersona=i+100, defaults={'nombre': nombre, 'activo': True})
            PersonaInstitucion.objects.get_or_create(
                persona=p, institucion=isae, tipo=estudiante_isae, curso=random.choice(cursos_isae)
            )
            estudiantes_creados.append(p)

        # 7. Asistencias (Últimos 30 días)
        self.stdout.write('📅 Generando historial de asistencias...')
        
        total_asistencias = 0
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        current_date = start_date
        while current_date <= end_date:
            # Solo días de semana
            if current_date.weekday() < 5: 
                # Simular asistencia para cada estudiante
                for persona in estudiantes_creados:
                    # 90% de probabilidad de tener registro ese día
                    if random.random() < 0.9:
                        # Determinar estado
                        rand = random.random()
                        if rand < 0.75: estado = presente
                        elif rand < 0.90: estado = tarde
                        else: estado = ausente
                        
                        # Temperatura (si presente/tarde)
                        temp = 0.0
                        if estado != ausente:
                            # 5% probabilidad de fiebre/alerta
                            if random.random() < 0.95:
                                temp = round(random.uniform(36.0, 37.2), 1)
                            else:
                                temp = round(random.uniform(37.3, 38.5), 1)
                        
                        # Hora aleatoria mañana (07:30 - 08:30)
                        hora_llegada = current_date.replace(
                            hour=random.randint(7, 8), 
                            minute=random.randint(0, 59),
                            second=0
                        )

                        Asistencia.objects.create(
                            persona=persona,
                            fechaHora=hora_llegada,
                            estado=estado,
                            temperatura=temp,
                            institucion=isae
                        )
                        total_asistencias += 1
            
            current_date += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(f'✅ ¡Listo! Se crearon {total_asistencias} registros de asistencia.'))
