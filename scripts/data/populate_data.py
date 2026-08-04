
import os
import django
import random
from datetime import datetime, timedelta
import sys

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'asistencIA.settings')
django.setup()

from asistencias.models import Persona, Horario, Asistencia, EstadoAsistencia, PersonaInstitucion
from django.utils import timezone

def populate():
    print("Generating random attendance data...")
    
    # Get base objects
    personas = list(Persona.objects.filter(activo=True))
    if not personas:
        print("No active Personas found. Please create some personas first.")
        return

    # Get states
    estado_presente, _ = EstadoAsistencia.objects.get_or_create(nombre='Presente')
    estado_tardanza, _ = EstadoAsistencia.objects.get_or_create(nombre='Tardanza')
    estado_ausente, _ = EstadoAsistencia.objects.get_or_create(nombre='Ausente')

    # Date range: Last 7 days
    today = timezone.now().date()
    start_date = today - timedelta(days=7)

    records_created = 0

    for i in range(8): # 0 to 7 days back
        current_date = start_date + timedelta(days=i)
        weekday_map = {0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves', 4: 'Viernes', 5: 'Sábado', 6: 'Domingo'}
        weekday_str = weekday_map[current_date.weekday()]

        if weekday_str in ['Sábado', 'Domingo']:
            continue

        print(f"Processing {current_date} ({weekday_str})...")

        for persona in personas:
            # Find schedule for this person on this day
            # Simplified: look for any active schedule for this day overlapping with person's course
            roles = PersonaInstitucion.objects.filter(persona=persona, activo=True)
            for role in roles:
                if not role.curso: continue
                
                horarios = Horario.objects.filter(curso=role.curso, dia=weekday_str, activo=True)
                
                for horario in horarios:
                    # Avoid duplicates
                    exists = Asistencia.objects.filter(
                        persona=persona, 
                        fechaHora__date=current_date, 
                        horario=horario
                    ).exists()
                    
                    if exists: continue

                    # Randomize attendance
                    rand = random.random()
                    
                    # 10% Absent
                    if rand < 0.10:
                        # Create absent record (sometimes systems don't create it, but let's say we do for tracking)
                        # Actually, typically absence is lack of record or explicit record. Let's create explicit.
                        Asistencia.objects.create(
                            persona=persona,
                            horario=horario,
                            institucion=role.institucion,
                            fechaHora=timezone.make_aware(datetime.combine(current_date, horario.hora_inicio)),
                            estado=estado_ausente,
                            temperatura=0,
                            llegada_tarde_minutos=0
                        )
                        records_created += 1
                        continue

                    # If present (90%)
                    
                    # Randomize Arrival Time
                    # On time: 80%, Late: 20%
                    is_late = random.random() < 0.20
                    
                    base_time = datetime.combine(current_date, horario.hora_inicio)
                    
                    if is_late:
                        delay = random.randint(1, 45) # 1 to 45 mins late
                        arrival_time = base_time + timedelta(minutes=delay)
                        estado = estado_tardanza
                        minutes_late = delay
                    else:
                        early = random.randint(0, 15) # 0 to 15 mins early/on time
                        arrival_time = base_time - timedelta(minutes=early)
                        estado = estado_presente
                        minutes_late = 0
                    
                    # Temperature
                    # Normal: 36.0 - 37.2 (90%)
                    # Fever: 37.5 - 39.5 (5%)
                    # High Normal: 37.3 - 37.5 (5%)
                    temp_rand = random.random()
                    if temp_rand < 0.90:
                        temp = round(random.uniform(36.0, 37.2), 1)
                    elif temp_rand < 0.95:
                        temp = round(random.uniform(37.3, 37.5), 1)
                    else:
                        temp = round(random.uniform(37.6, 39.5), 1) # Fever

                    Asistencia.objects.create(
                        persona=persona,
                        horario=horario,
                        institucion=role.institucion,
                        fechaHora=timezone.make_aware(arrival_time),
                        estado=estado,
                        temperatura=temp,
                        llegada_tarde_minutos=minutes_late
                    )
                    records_created += 1

    print(f"Done! Created {records_created} attendance records.")

if __name__ == '__main__':
    populate()
