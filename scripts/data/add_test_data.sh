#!/bin/bash
# add_test_data.sh - Agregar datos de prueba a la BD

echo "🧪 Agregando datos de prueba via Django shell..."

docker exec backend python /app/app/manage.py shell <<'EOF'
from asistencias.models import Institucion, TipoPersona, Curso, Persona, PersonaTipo

# Crear instituciones
inst_cluster, _ = Institucion.objects.get_or_create(nombre="Cluster Educativo", defaults={'activo': True})
inst_isae, _ = Institucion.objects.get_or_create(nombre="ISAE", defaults={'activo': True})

# Crear tipos
tipo_alumno_cluster, _ = TipoPersona.objects.get_or_create(nombre="Alumno", institucion=inst_cluster, defaults={'activo': True})
tipo_docente_cluster, _ = TipoPersona.objects.get_or_create(nombre="Docente", institucion=inst_cluster, defaults={'activo': True})
tipo_nodocente_cluster, _ = TipoPersona.objects.get_or_create(nombre="No Docente", institucion=inst_cluster, defaults={'activo': True})
tipo_alumno_isae, _ = TipoPersona.objects.get_or_create(nombre="Alumno", institucion=inst_isae, defaults={'activo': True})
tipo_docente_isae, _ = TipoPersona.objects.get_or_create(nombre="Docente", institucion=inst_isae, defaults={'activo': True})

# Crear cursos
curso_rob, _ = Curso.objects.get_or_create(nombre="Robótica", institucion=inst_cluster, defaults={'activo': True})
curso_prog, _ = Curso.objects.get_or_create(nombre="Programación", institucion=inst_cluster, defaults={'activo': True})
curso_1anio, _ = Curso.objects.get_or_create(nombre="1er Año", institucion=inst_isae, defaults={'activo': True})
curso_2anio, _ = Curso.objects.get_or_create(nombre="2do Año", institucion=inst_isae, defaults={'activo': True})

# Crear personas de prueba
personas_test = [
    ("TEST_Juan García", [{'inst': inst_cluster, 'tipo': tipo_alumno_cluster, 'curso': curso_rob}]),
    ("TEST_María Rodríguez", [
        {'inst': inst_cluster, 'tipo': tipo_docente_cluster, 'curso': curso_prog},
        {'inst': inst_isae, 'tipo': tipo_docente_isae, 'curso': None}
    ]),
    ("TEST_Carlos López", [{'inst': inst_cluster, 'tipo': tipo_nodocente_cluster, 'curso': None}]),
    ("TEST_Ana Martínez", [{'inst': inst_isae, 'tipo': tipo_alumno_isae, 'curso': curso_1anio}]),
    ("TEST_Roberto Hernández", [{'inst': inst_isae, 'tipo': tipo_alumno_isae, 'curso': curso_2anio}]),
]

created = 0
for nombre, roles in personas_test:
    persona, created_now = Persona.objects.get_or_create(nombre=nombre, defaults={'activo': True})
    if created_now:
        created += 1
        for rol in roles:
            PersonaTipo.objects.create(
                persona=persona,
                institucion=rol['inst'],
                tipo=rol['tipo'],
                curso=rol.get('curso')
            )
        print(f"  ✓ Creada: {nombre}")
    else:
        print(f"  - Ya existe: {nombre}")

print(f"\n✅ Completado: {created} personas nuevas creadas")
print(f"Total personas TEST_: {Persona.objects.filter(nombre__startswith='TEST_').count()}")
EOF

echo ""
echo "✅ Datos de prueba agregados!"
