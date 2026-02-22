from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from datetime import timedelta
import logging
from asistencias.models import Horario, PersonaInstitucion, Asistencia, EstadoAsistencia, DiaNoLaborable
from asistencias.constants import ESTADOS_ASISTENCIA

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Procesa las inasistencias y salidas no marcadas del día especificado (o el de hoy por defecto).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Fecha a procesar en formato YYYY-MM-DD (por defecto hoy)',
        )

    def handle(self, *args, **options):
        fecha_str = options.get('date')
        if fecha_str:
            try:
                from datetime import datetime
                fecha_procesamiento = timezone.make_aware(datetime.strptime(fecha_str, '%Y-%m-%d'))
            except ValueError:
                self.stdout.write(self.style.ERROR('Formato de fecha inválido. Use YYYY-MM-DD.'))
                return
        else:
            fecha_procesamiento = timezone.now()

        inicio_dia = fecha_procesamiento.replace(hour=0, minute=0, second=0, microsecond=0)
        fin_dia = inicio_dia + timedelta(days=1)
        
        dias_map = {
            0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves', 
            4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
        }
        dia_actual_nombre = dias_map[fecha_procesamiento.weekday()]

        self.stdout.write(self.style.SUCCESS(f'Iniciando procesamiento de faltas para el {dia_actual_nombre} {fecha_procesamiento.date()}'))

        # Obtener o crear los estados
        estado_ausente, _ = EstadoAsistencia.objects.get_or_create(nombre=ESTADOS_ASISTENCIA['AUSENTE'])
        estado_no_paso_salida, _ = EstadoAsistencia.objects.get_or_create(nombre=ESTADOS_ASISTENCIA['NO_PASO_SALIDA'])

        # Obtener horarios del día actual (solo cursos activos)
        horarios_hoy = Horario.objects.filter(
            dia=dia_actual_nombre, activo=True,
            curso__isnull=False, curso__activo=True
        )
        self.stdout.write(f'Horarios activos encontrados: {horarios_hoy.count()}')

        ausentes_count = 0
        olvidos_salida_count = 0

        for horario in horarios_hoy:
            curso = horario.curso
            institucion = curso.institucion
            
            # Obtener feriados para esta institución que cubran la fecha dada
            fecha_hoy = fecha_procesamiento.date()
            feriados_hoy = DiaNoLaborable.objects.filter(
                fecha_inicio__lte=fecha_hoy,
                institucion=institucion
            ).filter(
                # fecha_fin >= hoy OR fecha_fin es null (día único = fecha_inicio)
                models.Q(fecha_fin__gte=fecha_hoy) | models.Q(fecha_fin__isnull=True)
            )
            
            # Buscar personas activas inscriptas en este curso
            inscripciones = PersonaInstitucion.objects.filter(curso=curso, activo=True)
            
            for inscripcion in inscripciones:
                persona = inscripcion.persona
                
                # Verificar si es día no laborable para esta persona/curso
                es_feriado = False
                for feriado in feriados_hoy:
                    if feriado.aplica_a_todos:
                        es_feriado = True
                        break
                    if feriado.cursos_afectados.filter(idCurso=curso.idCurso).exists():
                        es_feriado = True
                        break
                    if feriado.tipos_persona_afectados.filter(idTipoPersona=inscripcion.tipo.idTipoPersona).exists():
                        es_feriado = True
                        break
                    if feriado.personas_afectadas.filter(idPersona=persona.idPersona).exists():
                        es_feriado = True
                        break
                
                if es_feriado:
                    continue # Saltar a la próxima inscripción sin registrar falta
                
                # Checkear si tiene entrada
                tiene_entrada = Asistencia.objects.filter(
                    persona=persona,
                    horario=horario,
                    tipo='Entrada',
                    fechaHora__gte=inicio_dia,
                    fechaHora__lt=fin_dia
                ).exists()

                if not tiene_entrada:
                    # Crear asistencia ausente
                    # Evitar duplicar el ausente
                    ausente_existente = Asistencia.objects.filter(
                        persona=persona,
                        horario=horario,
                        estado=estado_ausente,
                        fechaHora__gte=inicio_dia,
                        fechaHora__lt=fin_dia
                    ).exists()

                    if not ausente_existente:
                        Asistencia.objects.create(
                            persona=persona,
                            fechaHora=inicio_dia.replace(hour=horario.hora_inicio.hour, minute=horario.hora_inicio.minute),
                            temperatura=0.0,
                            estado=estado_ausente,
                            horario=horario,
                            institucion=curso.institucion,
                            tipo='Entrada',
                            llegada_tarde_minutos=0
                        )
                        ausentes_count += 1
                        self.stdout.write(f'  [AUSENTE] {persona.nombre} en {curso.nombre}')
                
                else:
                    # Tiene entrada, chequear salida si lo requiere
                    if persona.requiere_salida:
                        tiene_salida = Asistencia.objects.filter(
                            persona=persona,
                            horario=horario,
                            tipo='Salida',
                            fechaHora__gte=inicio_dia,
                            fechaHora__lt=fin_dia
                        ).exists()

                        if not tiene_salida:
                            # Crear asistencia de olvido de salida
                            olvido_existente = Asistencia.objects.filter(
                                persona=persona,
                                horario=horario,
                                estado=estado_no_paso_salida,
                                fechaHora__gte=inicio_dia,
                                fechaHora__lt=fin_dia
                            ).exists()

                            if not olvido_existente:
                                Asistencia.objects.create(
                                    persona=persona,
                                    fechaHora=inicio_dia.replace(hour=horario.hora_fin.hour, minute=horario.hora_fin.minute),
                                    temperatura=0.0,
                                    estado=estado_no_paso_salida,
                                    horario=horario,
                                    institucion=curso.institucion,
                                    tipo='Salida',
                                    llegada_tarde_minutos=0
                                )
                                olvidos_salida_count += 1
                                self.stdout.write(f'  [OLVIDÓ SALIDA] {persona.nombre} en {curso.nombre}')

        self.stdout.write(self.style.SUCCESS(
            f'Proceso completado. Resumen:\n - Ausentes generados: {ausentes_count}\n - Olvido de salida generados: {olvidos_salida_count}'
        ))
