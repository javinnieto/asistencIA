#!/usr/bin/env python
"""
Script para gestionar datos de prueba en la base de datos.
Uso:
  python manage_test_data.py add     # Agregar datos de prueba
  python manage_test_data.py remove  # Eliminar datos de prueba
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'asistencias.settings')
django.setup()

from asistencias.models import Institucion, TipoPersona, Curso, Persona, PersonaTipo

# IDs de prueba marcados con prefijo TEST_
TEST_PREFIX = "TEST_"

def add_test_data():
    print("🧪 Agregando datos de prueba...")
    
    # 1. Instituciones
    inst_cluster, _ = Institucion.objects.get_or_create(
        nombre="Cluster Educativo", 
        defaults={'activo': True}
    )
    inst_isae, _ = Institucion.objects.get_or_create(
        nombre="ISAE", 
        defaults={'activo': True}
    )
    
    # 2. Tipos de Persona
    tipo_alumno_cluster, _ = TipoPersona.objects.get_or_create(
        nombre="Alumno",
        institucion=inst_cluster,
        defaults={'activo': True}
    )
    tipo_docente_cluster, _ = TipoPersona.objects.get_or_create(
        nombre="Docente",
        institucion=inst_cluster,
        defaults={'activo': True}
    )
    tipo_nodocente_cluster, _ = TipoPersona.objects.get_or_create(
        nombre="No Docente",
        institucion=inst_cluster,
        defaults={'activo': True}
    )
    
    tipo_alumno_isae, _ = TipoPersona.objects.get_or_create(
        nombre="Alumno",
        institucion=inst_isae,
        defaults={'activo': True}
    )
    tipo_docente_isae, _ = TipoPersona.objects.get_or_create(
        nombre="Docente",
        institucion=inst_isae,
        defaults={'activo': True}
    )
    
    # 3. Cursos
    curso_rob, _ = Curso.objects.get_or_create(
        nombre="Robótica",
        institucion=inst_cluster,
        defaults={'activo': True}
    )
    curso_prog, _ = Curso.objects.get_or_create(
        nombre="Programación",
        institucion=inst_cluster,
        defaults={'activo': True}
    )
    curso_1anio, _ = Curso.objects.get_or_create(
        nombre="1er Año",
        institucion=inst_isae,
        defaults={'activo': True}
    )
    curso_2anio, _ = Curso.objects.get_or_create(
        nombre="2do Año",
        institucion=inst_isae,
        defaults={'activo': True}
    )
    
    # 4. Personas de prueba
    personas_test = [
        {
            'nombre': f'{TEST_PREFIX}Juan García',
            'activo': True,
            'roles': [
                {'institucion': inst_cluster, 'tipo': tipo_alumno_cluster, 'curso': curso_rob}
            ]
        },
        {
            'nombre': f'{TEST_PREFIX}María Rodríguez',
            'activo': True,
            'roles': [
                {'institucion': inst_cluster, 'tipo': tipo_docente_cluster, 'curso': curso_prog},
                {'institucion': inst_isae, 'tipo': tipo_docente_isae, 'curso': None}
            ]
        },
        {
            'nombre': f'{TEST_PREFIX}Carlos López',
            'activo': True,
            'roles': [
                {'institucion': inst_cluster, 'tipo': tipo_nodocente_cluster, 'curso': None}
            ]
        },
        {
            'nombre': f'{TEST_PREFIX}Ana Martínez',
            'activo': True,
            'roles': [
                {'institucion': inst_isae, 'tipo': tipo_alumno_isae, 'curso': curso_1anio}
            ]
        },
        {
            'nombre': f'{TEST_PREFIX}Roberto Hernández',
            'activo': True,
            'roles': [
                {'institucion': inst_isae, 'tipo': tipo_alumno_isae, 'curso': curso_2anio}
            ]
        },
    ]
    
    created_count = 0
    for p_data in personas_test:
        # Crear persona si no existe
        persona, created = Persona.objects.get_or_create(
            nombre=p_data['nombre'],
            defaults={'activo': p_data['activo']}
        )
        
        if created:
            created_count += 1
            print(f"  ✓ Creada: {p_data['nombre']}")
            
            # Agregar roles
            for rol_data in p_data['roles']:
                PersonaTipo.objects.create(
                    persona=persona,
                    institucion=rol_data['institucion'],
                    tipo=rol_data['tipo'],
                    curso=rol_data.get('curso')
                )
        else:
            print(f"  - Ya existe: {p_data['nombre']}")
    
    print(f"\n✅ Datos de prueba agregados ({created_count} personas nuevas)")
    print(f"Total personas con prefijo {TEST_PREFIX}: {Persona.objects.filter(nombre__startswith=TEST_PREFIX).count()}")


def remove_test_data():
    print("🗑️  Eliminando datos de prueba...")
    
    # Eliminar personas de prueba
    test_personas = Persona.objects.filter(nombre__startswith=TEST_PREFIX)
    count = test_personas.count()
    
    if count == 0:
        print("  No hay datos de prueba para eliminar")
        return
    
    # Mostrar qué se va a eliminar
    print(f"\n  Personas a eliminar ({count}):")
    for p in test_personas:
        print(f"    - {p.nombre}")
    
    # Confirmar
    confirm = input(f"\n¿Eliminar {count} personas de prueba? (s/n): ")
    if confirm.lower() == 's':
        test_personas.delete()
        print(f"✅ {count} personas de prueba eliminadas")
    else:
        print("❌ Operación cancelada")


def main():
    if len(sys.argv) < 2:
        print("Uso: python manage_test_data.py [add|remove]")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'add':
        add_test_data()
    elif command == 'remove':
        remove_test_data()
    else:
        print(f"Comando desconocido: {command}")
        print("Uso: python manage_test_data.py [add|remove]")
        sys.exit(1)


if __name__ == '__main__':
    main()
