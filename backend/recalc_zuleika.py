from asistencias.models import Asistencia, Persona, Horario, PersonaInstitucion, EstadoAsistencia
from django.utils import timezone
from django.db.models import Q
import datetime

def run():
    p = Persona.objects.get(idPersona=102)
    asistencias = Asistencia.objects.filter(persona=p)
    count = 0
    
    dias_map = {0:'Lunes', 1:'Martes', 2:'Miércoles', 3:'Jueves', 4:'Viernes', 5:'Sábado', 6:'Domingo'}
    presente_estado, _ = EstadoAsistencia.objects.get_or_create(nombre='Presente')

    for a in asistencias:
        if a.horario:
            continue
        
        dt = a.fechaHora
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        
        # Localize to Argentina
        dt_local = timezone.localtime(dt)
        dia_actual = dias_map[dt_local.weekday()]
        
        cursos_ids = PersonaInstitucion.objects.filter(
            persona=p, activo=True, curso__isnull=False
        ).values_list('curso_id', flat=True)
            
        roles_ids = PersonaInstitucion.objects.filter(
            persona=p, activo=True
        ).values_list('idPersonaInstitucion', flat=True)

        h_candidatos = Horario.objects.filter(
            Q(curso_id__in=cursos_ids) | Q(persona_institucion_id__in=roles_ids),
            dia=dia_actual, activo=True
        )

        best_h = None
        for h in h_candidatos:
            # Check if t is within [start - 1h, end]
            start_dt = dt_local.replace(hour=h.hora_inicio.hour, minute=h.hora_inicio.minute, second=0, microsecond=0)
            end_dt = dt_local.replace(hour=h.hora_fin.hour, minute=h.hora_fin.minute, second=0, microsecond=0)
            
            # For retro-compatibility with the bug we fixed, we just check if it was at the same date and close to the hours
            # We broaden the window to 2 hours before just in case
            if (start_dt - datetime.timedelta(hours=2)) <= dt_local <= end_dt:
                best_h = h
                break
        
        if best_h:
            a.horario = best_h
            a.estado = presente_estado
            # Recalcular minutos de tardanza?
            if dt_local.time() > best_h.hora_inicio:
                tardanza = (datetime.datetime.combine(datetime.date.min, dt_local.time()) - 
                           datetime.datetime.combine(datetime.date.min, best_h.hora_inicio)).seconds // 60
                a.llegada_tarde_minutos = tardanza
            else:
                a.llegada_tarde_minutos = 0
                
            a.save()
            count += 1
            print(f"[{a.fechaHora}] -> Asignado a {best_h.curso.nombre if best_h.curso else 'Rol'}")

    print(f"Total recalculadas: {count}")

if __name__ == "__main__":
    run()
