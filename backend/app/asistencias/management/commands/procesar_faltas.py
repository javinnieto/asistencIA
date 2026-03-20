from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from datetime import timedelta, datetime
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
                fecha_procesamiento = timezone.make_aware(datetime.strptime(fecha_str, '%Y-%m-%d'))
            except ValueError:
                self.stdout.write(self.style.ERROR('Formato de fecha inválido. Use YYYY-MM-DD.'))
                return
        else:
            fecha_procesamiento = timezone.localtime(timezone.now())

        inicio_dia = fecha_procesamiento.replace(hour=0, minute=0, second=0, microsecond=0)
        # Asegurarnos de que inicio_dia sea aware en la zona local si no lo es
        if timezone.is_naive(inicio_dia):
            inicio_dia = timezone.make_aware(inicio_dia)
        else:
            inicio_dia = timezone.localtime(inicio_dia)
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
        # Obtener horarios del día actual (cursos y horarios personales)
        from django.db.models import Q
        horarios_hoy = Horario.objects.filter(
            dia=dia_actual_nombre, activo=True
        ).filter(
            Q(curso__isnull=False, curso__activo=True, curso__institucion__activa=True) |
            Q(persona_institucion__isnull=False, persona_institucion__activo=True, persona_institucion__institucion__activa=True)
        )
        self.stdout.write(f'Horarios activos encontrados: {horarios_hoy.count()}')

        ausentes_count = 0
        olvidos_salida_count = 0

        for horario in horarios_hoy:
            if horario.curso:
                institucion = horario.curso.institucion
                # Inscripciones masivas (estudiantes u otros asignados al curso explícitamente)
                inscripciones = PersonaInstitucion.objects.filter(curso=horario.curso, activo=True)
                nombre_contexto = f"curso {horario.curso.nombre}"
                id_filtro_feriado = {'curso_id': horario.curso.idCurso}
            elif horario.persona_institucion:
                institucion = horario.persona_institucion.institucion
                # El único inscrito posible a este horario individual es este rol exacto
                inscripciones = [horario.persona_institucion]
                nombre_contexto = f"horario personal de {horario.persona_institucion.tipo.nombre}"
                id_filtro_feriado = None
            else:
                continue

            # Si estamos procesando el día de hoy, ignorar horarios que aún no han terminado
            # IMPORTANTE: Usar localtime para comparar la fecha real en Argentina
            ahora_local = timezone.localtime(timezone.now())
            if fecha_procesamiento.date() == ahora_local.date():
                if ahora_local.time() < horario.hora_fin:
                    self.stdout.write(f'  [SKIPPING] {nombre_contexto} (clase aún no termina: {horario.hora_fin})')
                    continue
            
            # Obtener feriados para esta institución que cubran la fecha dada
            fecha_hoy = fecha_procesamiento.date()
            feriados_hoy = DiaNoLaborable.objects.filter(
                fecha_inicio__lte=fecha_hoy,
                institucion=institucion
            ).filter(
                # fecha_fin >= hoy OR fecha_fin es null (día único = fecha_inicio)
                models.Q(fecha_fin__gte=fecha_hoy) | models.Q(fecha_fin__isnull=True)
            )
            
            # Las personas activas inscriptas en este horario ya están en la variable `inscripciones`
            
            for inscripcion in inscripciones:
                persona = inscripcion.persona
                
                # Verificar si es día no laborable para esta persona/curso
                es_feriado = False
                for feriado in feriados_hoy:
                    if feriado.aplica_a_todos:
                        es_feriado = True
                        break
                    if id_filtro_feriado and feriado.cursos_afectados.filter(**id_filtro_feriado).exists():
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
                
                # Checkear si tiene una entrada REAL (excluimos los Ausentes generados por el sistema)
                tiene_entrada = Asistencia.objects.filter(
                    persona=persona,
                    horario=horario,
                    tipo='Entrada',
                    fechaHora__gte=inicio_dia,
                    fechaHora__lt=fin_dia
                ).exclude(estado__nombre=ESTADOS_ASISTENCIA['AUSENTE']).exists()

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
                        # Marcamos la falta al FINAL de la clase (como pidió el usuario)
                        fechaHora_ausente = timezone.make_aware(
                            datetime.combine(fecha_procesamiento.date(), horario.hora_fin)
                        )
                        Asistencia.objects.create(
                            persona=persona,
                            fechaHora=fechaHora_ausente,
                            temperatura=0.0,
                            estado=estado_ausente,
                            horario=horario,
                            institucion=institucion,
                            tipo=None,  # No fue un scan real, lo generó el sistema
                            llegada_tarde_minutos=0
                        )
                        ausentes_count += 1
                        self.stdout.write(f'  [AUSENTE] {persona.nombre} en {nombre_contexto}')
                
                else:
                    # Tiene entrada, chequear salida si lo requiere
                    if persona.requiere_salida:
                        # Chequear si tiene una salida REAL (excluimos los No pasó a la salida generados por el sistema)
                        tiene_salida = Asistencia.objects.filter(
                            persona=persona,
                            horario=horario,
                            tipo='Salida',
                            fechaHora__gte=inicio_dia,
                            fechaHora__lt=fin_dia
                        ).exclude(estado__nombre=ESTADOS_ASISTENCIA['NO_PASO_SALIDA']).exists()

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
                                fechaHora_olvido = timezone.make_aware(
                                    datetime.combine(fecha_procesamiento.date(), horario.hora_fin)
                                )
                                Asistencia.objects.create(
                                    persona=persona,
                                    fechaHora=fechaHora_olvido,
                                    temperatura=0.0,
                                    estado=estado_no_paso_salida,
                                    horario=horario,
                                    institucion=institucion,
                                    tipo=None,  # No fue un scan real, lo generó el sistema
                                    llegada_tarde_minutos=0
                                )
                                olvidos_salida_count += 1
                                self.stdout.write(f'  [OLVIDÓ SALIDA] {persona.nombre} en {nombre_contexto}')

        self.stdout.write(self.style.SUCCESS(
            f'Proceso completado. Resumen:\n - Ausentes generados: {ausentes_count}\n - Olvido de salida generados: {olvidos_salida_count}'
        ))
