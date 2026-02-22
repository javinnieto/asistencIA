from django.db import migrations

TIPOS_DEFAULT = [
    'Estudiante',
    'Docente',
    'Empleado',
    'Personal Administrativo',
    'Director',
]

ESTADOS_DEFAULT = [
    'Presente',
    'Ausente',
    'Tardanza',
    'Justificado',
    'Fuera de Horario',
    'Se fue antes',
    'No pasó a la salida',
]


def create_defaults(apps, schema_editor):
    EstadoAsistencia = apps.get_model('asistencias', 'EstadoAsistencia')
    TipoPersona = apps.get_model('asistencias', 'TipoPersona')
    Institucion = apps.get_model('asistencias', 'Institucion')

    for nombre in ESTADOS_DEFAULT:
        EstadoAsistencia.objects.get_or_create(nombre=nombre)

    # TipoPersona requires an institution – create a default one if none exists
    inst, _ = Institucion.objects.get_or_create(nombre='General', defaults={'activa': True})
    for nombre in TIPOS_DEFAULT:
        TipoPersona.objects.get_or_create(nombre=nombre, institucion=inst)


def reverse_defaults(apps, schema_editor):
    pass  # Keep data on reverse; do not delete


class Migration(migrations.Migration):

    dependencies = [
        ('asistencias', '0015_asistencia_salida_temprano_minutos'),
    ]

    operations = [
        migrations.RunPython(create_defaults, reverse_defaults),
    ]
