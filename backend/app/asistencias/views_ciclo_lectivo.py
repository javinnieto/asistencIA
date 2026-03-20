from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from .models import PersonaInstitucion, Curso, TransicionAnioLectivo
import logging

logger = logging.getLogger(__name__)

# Mapa de transición de cursos para la institución ISAE
MAPPING_CURSOS = {
    # Primaria
    '1er grado': '2do grado',
    '2do grado': '3er grado',
    '3er grado': '4to grado',
    '4to grado': '5to grado',
    '5to grado': '6to grado',
    '6to grado': '7mo grado',
    '7mo grado': None, # Egreso Primaria
    
    # Secundaria - Ciencias Naturales
    '1er año (cs naturales)': '2do año (cs naturales)',
    '2do año (cs naturales)': '3er año (cs naturales)',
    '3er año (cs naturales)': '4to año (cs naturales)',
    '4to año (cs naturales)': '5to año (cs naturales)',
    '5to año (cs naturales)': None, # Egreso Secundaria
    
    # Secundaria - Informática
    '1er año (informática)': '2do año (informática)',
    '2do año (informática)': '3er año (informática)',
    '3er año (informática)': '4to año (informática)',
    '4to año (informática)': '5to año (informática)',
    '5to año (informática)': None, # Egreso Secundaria
}

class CicloLectivoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Avanzar todos los alumnos de la institución activa al siguiente año"""
        # Solo Admin puede avanzar
        if not getattr(request.user, 'is_staff', False) and not getattr(request.user, 'is_superuser', False):
            return Response({'error': 'Solo el administrador puede realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        # 1. Preparar cursos destino
        cursos_destino_nombres = set(filter(None, MAPPING_CURSOS.values()))
        cursos_destino_objs = {}
        
        for nombre in cursos_destino_nombres:
            try:
                curso = Curso.objects.get(nombre__iexact=nombre, institucion__nombre__iexact='ISAE', activo=True)
                cursos_destino_objs[nombre.lower()] = curso
            except Curso.DoesNotExist:
                return Response({'error': f'Falta crear el curso "{nombre}" antes de habilitar los pases.'}, status=400)
            except Curso.MultipleObjectsReturned:
                return Response({'error': f'Hay múltiples cursos llamados "{nombre}".'}, status=400)

        # 2. Buscar estudiantes actuales
        estudiantes_isae = PersonaInstitucion.objects.filter(
            institucion__nombre__iexact='ISAE',
            tipo__nombre__iexact='Estudiante',
            activo=True,
            curso__isnull=False
        ).select_related('curso')

        totales = {'avanzados': 0, 'egresados': 0, 'ignorados': 0, 'procesados': 0}
        backup_data = []

        try:
            with transaction.atomic():
                for rol in estudiantes_isae:
                    curso_actual = rol.curso.nombre.strip().lower()
                    next_curso_name = None
                    
                    for from_course, to_course in MAPPING_CURSOS.items():
                        if from_course.lower() == curso_actual:
                            next_curso_name = to_course
                            break
                    else:
                        # Ignorar si el curso no mapea
                        totales['ignorados'] += 1
                        continue

                    # Guardar snapshot para Revertir
                    backup_data.append({
                        'id_rol': rol.idPersonaInstitucion,
                        'old_curso_id': rol.curso_id,
                        'old_curso_name': rol.curso.nombre,
                        'new_curso_name': next_curso_name if next_curso_name else 'EGRESADO'
                    })
                    
                    totales['procesados'] += 1

                    if next_curso_name is None:
                        # Egreso
                        rol.curso = None
                        totales['egresados'] += 1
                    else:
                        # Avance normal
                        rol.curso = cursos_destino_objs.get(next_curso_name.lower())
                        totales['avanzados'] += 1
                    
                    rol.save()

                # Guardar el Histórico
                if backup_data:
                    TransicionAnioLectivo.objects.create(
                        usuario=request.user,
                        datos_reversion=backup_data
                    )

            return Response({
                'mensaje': 'Avance de año completado de forma exitosa.',
                'stats': totales
            })
            
        except Exception as e:
            logger.error(f"Error procesando avance de año: {str(e)}")
            return Response({'error': f'Error interno: {str(e)}'}, status=500)


class RevertirCicloLectivoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Revertir el último avance de año"""
        if not getattr(request.user, 'is_staff', False) and not getattr(request.user, 'is_superuser', False):
            return Response({'error': 'Solo el administrador puede realizar esta acción.'}, status=status.HTTP_403_FORBIDDEN)

        # Obtener la última transición NO revertida
        ultima_transicion = TransicionAnioLectivo.objects.filter(revertido=False).first()
        
        if not ultima_transicion:
            return Response({'error': 'No hay ningún avance de año reciente que se pueda revertir.'}, status=400)

        datos = ultima_transicion.datos_reversion
        if not datos:
            return Response({'error': 'Los datos de la transición están corruptos o vacíos.'}, status=400)

        totales = {'restaurados': 0, 'errores': 0}

        try:
            with transaction.atomic():
                for backup in datos:
                    id_rol = backup.get('id_rol')
                    old_curso_id = backup.get('old_curso_id')
                    
                    if not id_rol: continue

                    try:
                        rol = PersonaInstitucion.objects.get(idPersonaInstitucion=id_rol)
                        # Restauramos el curso anterior (puede ser id int o None)
                        if old_curso_id:
                            curso = Curso.objects.get(idCurso=old_curso_id)
                            rol.curso = curso
                        else:
                            rol.curso = None
                            
                        rol.save()
                        totales['restaurados'] += 1
                    except (PersonaInstitucion.DoesNotExist, Curso.DoesNotExist):
                        totales['errores'] += 1
                
                # Marcar como revertida
                ultima_transicion.revertido = True
                ultima_transicion.save()

            return Response({
                'mensaje': 'El ciclo lectivo ha sido revertido exitosamente.',
                'stats': totales
            })

        except Exception as e:
            logger.error(f"Error revirtiendo avance de año: {str(e)}")
            return Response({'error': f'Error interno: {str(e)}'}, status=500)
