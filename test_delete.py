import os
import django
import sys
sys.path.append('/home/radex/asistencIA/backend/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from asistencias.models import Persona, ConflictoIdentidad
from django.contrib.auth.models import User

# Check if there's a conflict
conflicts = ConflictoIdentidad.objects.filter(resuelto=False)
if not conflicts.exists():
    print("No open conflicts")
else:
    c = conflicts.first()
    id_nuevo = c.id_persona_nueva
    print("Conflict id", c.idConflicto, "has id_nuevo", id_nuevo)
    print("Personas in DB before:", Persona.objects.count())
    count = Persona.objects.filter(idPersona=id_nuevo).count()
    print("Does persona", id_nuevo, "exist?", count > 0)
