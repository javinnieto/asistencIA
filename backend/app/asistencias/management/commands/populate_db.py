from django.core.management.base import BaseCommand
from django.utils import timezone
from asistencias.models import (
    Institucion, TipoPersona, Curso, Persona, PersonaInstitucion, 
    EstadoAsistencia, Asistencia
)
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Pobla la base de datos con datos de ejemplo para AsistencIA (modelo genérico)'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Limpiar datos existentes antes de poblar')

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('🧹 Limpiando datos existentes...')
            Asistencia.objects.all().delete()
            PersonaInstitucion.objects.all().delete()
            Persona.objects.all().delete()
            Curso.objects.all().delete()
            TipoPersona.objects.all().delete()
            Institucion.objects.all().delete()
            EstadoAsistencia.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Datos limpiados'))

        self.stdout.write('🌱 Poblando base de datos con modelo genérico...')

        # 1. Crear Instituciones
        self.stdout.write('📚 Creando instituciones...')
        isae, _ = Institucion.objects.get_or_create(
            nombre='ISAE',
            defaults={'descripcion': 'Instituto Superior de Enseñanza', 'activa': True}
        )
        tecno, _ = Institucion.objects.get_or_create(
            nombre='TecnoAliados',
            defaults={'descripcion': 'Cursos Extraprogramáticos de Tecnología', 'activa': True}
        )

        # 2. Crear Tipos de Persona por Institución
        self.stdout.write('👥 Creando tipos de persona...')
        
        # Tipos ISAE
        estudiante_isae, _ = TipoPersona.objects.get_or_create(
            nombre='Estudiante', institucion=isae, defaults={'activo': True})
        profesor_isae, _ = TipoPersona.objects.get_or_create(
            nombre='Profesor', institucion=isae, defaults={'activo': True})
        admin_isae, _ = TipoPersona.objects.get_or_create(
            nombre='Administrativo', institucion=isae, defaults={'activo': True})
        director_isae, _ = TipoPersona.objects.get_or_create(
            nombre='Director', institucion=isae, defaults={'activo': True})
        
        # Tipos TecnoAliados
        estudiante_tecno, _ = TipoPersona.objects.get_or_create(
            nombre='Estudiante', institucion=tecno, defaults={'activo': True})
        instructor_tecno, _ = TipoPersona.objects.get_or_create(
            nombre='Instructor', institucion=tecno, defaults={'activo': True})

        # 3. Crear Cursos por Institución
        self.stdout.write('📖 Creando cursos...')
        
        # Cursos ISAE
        cursos_isae = []
        for grado in ['1er Año', '2do Año', '3er Año', '4to Año', '5to Año', '6to Año']:
            curso, _ = Curso.objects.get_or_create(
                nombre=grado, institucion=isae, defaults={'activo': True})
            cursos_isae.append(curso)
        
        # Cursos TecnoAliados
        cursos_tecno = []
        for curso_nombre in ['Programación Python', 'Desarrollo Web', 'Diseño Gráfico', 'Robótica', 'Marketing Digital']:
            curso, _ = Curso.objects.get_or_create(
                nombre=curso_nombre, institucion=tecno, defaults={'activo': True})
            cursos_tecno.append(curso)

        # 4. Estados de Asistencia
        self.stdout.write('📊 Creando estados de asistencia...')
        presente, _ = EstadoAsistencia.objects.get_or_create(
            nombre='Presente', defaults={'descripcion': 'Asistencia registrada correctamente'})
        ausente, _ = EstadoAsistencia.objects.get_or_create(
            nombre='Ausente', defaults={'descripcion': 'No se registró asistencia'})
        tarde, _ = EstadoAsistencia.objects.get_or_create(
            nombre='Tarde', defaults={'descripcion': 'Llegada tardía'})

        # 5. Crear Personas y sus roles
        self.stdout.write('👤 Creando personas...')
        
        # Javier Nieto (rol múltiple: estudiante ISAE + instructor TecnoAliados)
        javier, created = Persona.objects.get_or_create(
            idPersona=47, defaults={'nombre': 'Javier Nieto', 'activo': True})
        PersonaInstitucion.objects.get_or_create(
            persona=javier, institucion=isae, tipo=estudiante_isae, 
            curso=cursos_isae[4], defaults={'activo': True})  # 5to año
        PersonaInstitucion.objects.get_or_create(
            persona=javier, institucion=tecno, tipo=instructor_tecno, 
            curso=cursos_tecno[0], defaults={'activo': True})  # Python

        # Estudiantes ISAE
        estudiantes_isae = [
            (1, 'Juan Pérez'), (2, 'María García'), (3, 'Carlos López'), 
            (4, 'Ana Martínez'), (5, 'Luis Rodríguez')
        ]
        for id_persona, nombre in estudiantes_isae:
            persona, _ = Persona.objects.get_or_create(
                idPersona=id_persona, defaults={'nombre': nombre, 'activo': True})
            PersonaInstitucion.objects.get_or_create(
                persona=persona, institucion=isae, tipo=estudiante_isae,
                curso=random.choice(cursos_isae), defaults={'activo': True})

        # Profesores ISAE
        profesores_isae = [(10, 'Prof. Roberto Silva'), (11, 'Prof. Carmen Vega')]
        for id_persona, nombre in profesores_isae:
            persona, _ = Persona.objects.get_or_create(
                idPersona=id_persona, defaults={'nombre': nombre, 'activo': True})
            PersonaInstitucion.objects.get_or_create(
                persona=persona, institucion=isae, tipo=profesor_isae,
                defaults={'activo': True})

        # Personal administrativo y directivo ISAE
        admin, _ = Persona.objects.get_or_create(
            idPersona=20, defaults={'nombre': 'Admin. Patricia Ruiz', 'activo': True})
        PersonaInstitucion.objects.get_or_create(
            persona=admin, institucion=isae, tipo=admin_isae, defaults={'activo': True})

        director, _ = Persona.objects.get_or_create(
            idPersona=30, defaults={'nombre': 'Dir. Miguel Torres', 'activo': True})
        PersonaInstitucion.objects.get_or_create(
            persona=director, institucion=isae, tipo=director_isae, defaults={'activo': True})

        # Instructores TecnoAliados
        instructores_tecno = [(40, 'Instructor Python'), (41, 'Instructor Web')]
        for i, (id_persona, nombre) in enumerate(instructores_tecno):
            persona, _ = Persona.objects.get_or_create(
                idPersona=id_persona, defaults={'nombre': nombre, 'activo': True})
            PersonaInstitucion.objects.get_or_create(
                persona=persona, institucion=tecno, tipo=instructor_tecno,
                curso=cursos_tecno[i], defaults={'activo': True})

        # Estudiantes TecnoAliados
        estudiantes_tecno = [(50, 'Tech Student 1'), (51, 'Tech Student 2')]
        for id_persona, nombre in estudiantes_tecno:
            persona, _ = Persona.objects.get_or_create(
                idPersona=id_persona, defaults={'nombre': nombre, 'activo': True})
            PersonaInstitucion.objects.get_or_create(
                persona=persona, institucion=tecno, tipo=estudiante_tecno,
                curso=random.choice(cursos_tecno), defaults={'activo': True})

        # 6. Crear Asistencias de los últimos 30 días
        self.stdout.write('📅 Creando asistencias...')
        
        personas_todas = Persona.objects.all()
        estados = [presente, tarde]
        
        for i in range(30):
            fecha = timezone.now() - timedelta(days=i)
            personas_del_dia = random.sample(list(personas_todas), k=int(len(personas_todas) * 0.8))
            
            for persona in personas_del_dia:
                temperatura = round(random.uniform(36.0, 37.5), 1)
                hora_random = random.randint(7*60, 8*60 + 30)
                fecha_con_hora = fecha.replace(
                    hour=hora_random // 60, minute=hora_random % 60, second=random.randint(0, 59))
                
                Asistencia.objects.get_or_create(
                    persona=persona, fechaHora=fecha_con_hora,
                    defaults={
                        'temperatura': temperatura, 'estado': random.choice(estados),
                        'institucion': isae if persona.idPersona < 40 else tecno
                    })

        # Estadísticas finales
        stats = {
            'instituciones': Institucion.objects.count(),
            'tipos': TipoPersona.objects.count(),
            'cursos': Curso.objects.count(),
            'personas': Persona.objects.count(),
            'roles': PersonaInstitucion.objects.count(),
            'asistencias': Asistencia.objects.count()
        }

        self.stdout.write(self.style.SUCCESS(f'''
🎉 ¡Base de datos poblada exitosamente!

📊 ESTADÍSTICAS:
   • Instituciones: {stats['instituciones']}
   • Tipos de Persona: {stats['tipos']}
   • Cursos: {stats['cursos']}
   • Personas: {stats['personas']}
   • Roles (PersonaInstitucion): {stats['roles']}
   • Asistencias: {stats['asistencias']}

🔧 MODELO GENÉRICO IMPLEMENTADO:
   • Instituciones: ISAE, TecnoAliados
   • Roles flexibles por institución
   • Personas con múltiples roles
   • Escalable para futuras instituciones

✅ Sistema listo para pruebas!
        '''))
