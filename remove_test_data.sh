#!/bin/bash
# remove_test_data.sh - Eliminar datos de prueba de la BD

echo "🗑️  Eliminando datos de prueba..."

docker exec backend python /app/app/manage.py shell <<'EOF'
from asistencias.models import Persona

test_personas = Persona.objects.filter(nombre__startswith='TEST_')
count = test_personas.count()

if count == 0:
    print("No hay datos de prueba para eliminar")
else:
    print(f"Eliminando {count} personas de prueba:")
    for p in test_personas:
        print(f"  - {p.nombre}")
    test_personas.delete()
    print(f"\n✅ {count} personas eliminadas")
EOF

echo "✅ Proceso completado!"
