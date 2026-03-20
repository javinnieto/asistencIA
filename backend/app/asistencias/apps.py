from django.apps import AppConfig
from django.db.models.signals import post_migrate

def _setup_default_data(sender, **kwargs):
    """
    Se ejecuta después de procesar todas las migraciones.
    Inicializa todos los datos core del sistema (Estados, Configuración de Semana, 
    Institución, Tipos de Persona y Cursos por defecto).
    """
    try:
        from asistencias.models import Institucion, Curso, TipoPersona, EstadoAsistencia, ConfiguracionSemana
        from asistencias.constants import ESTADOS_ASISTENCIA, TIPOS_ISAE
        from datetime import date
        
        # 1. Estados de Asistencia
        for key, nombre in ESTADOS_ASISTENCIA.items():
            EstadoAsistencia.objects.get_or_create(nombre=nombre)
            
        # 2. Configuración Semanal (Semana A)
        if not ConfiguracionSemana.objects.exists():
            ConfiguracionSemana.objects.create(fecha_referencia_semana_a=date.today())
        
        # 3. Verificar o crear la institución
        isae, _ = Institucion.objects.get_or_create(
            nombre='ISAE', 
            defaults={'descripcion': 'Instituto Superior', 'activa': True}
        )
        
        # 4. Crear Tipos de Persona por defecto
        # Primero aseguramos el núcleo desde las constantes
        for key, nombre in TIPOS_ISAE.items():
            TipoPersona.objects.get_or_create(nombre=nombre, institucion=isae)
            
        # Agregamos tipos extra requeridos por el sistema
        TipoPersona.objects.get_or_create(nombre='Ex estudiante', institucion=isae)
        
        # 5. Poblar Cursos solo si NO existen cursos para ISAE (tabla "virgen")
        if not Curso.objects.filter(institucion=isae).exists():
            cursos_defaults = [
                '1er grado', '2do grado', '3er grado', '4to grado', '5to grado', '6to grado', '7mo grado',
                '1er año (cs naturales)', '1er año (informática)',
                '2do año (cs naturales)', '2do año (informática)',
                '3er año (cs naturales)', '3er año (informática)',
                '4to año (cs naturales)', '4to año (informática)',
                '5to año (cs naturales)', '5to año (informática)'
            ]
            for grado in cursos_defaults:
                Curso.objects.create(nombre=grado, institucion=isae, activo=True)
            print("📗 Cursos y Baseline de ISAE creados automáticamente.")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error cargando default data post_migrate: {e}")


class AsistenciasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'asistencias'
    verbose_name = 'Gestión de Asistencias'

    def ready(self):
        # Conectar la señal para que corra después de hacer migrate
        post_migrate.connect(_setup_default_data, sender=self)

        import sys
        # Avoid starting the thread twice in dev (runserver reload) o durante migraciones
        if 'runserver' not in sys.argv and 'wsgi' not in sys.argv and 'gunicorn' not in sys.argv:
            return
            
        from django.conf import settings
        import threading
        
        def run_background_tasks():
            import time
            from django.core.management import call_command
            from asistencias.views import sync_device_background
            
            # Esperar 60 segundos antes de la primera ejecución para dar tiempo a que inicie la DB
            time.sleep(60)
            sync_counter = 0
            
            while True:
                try:
                    import logging
                    logger = logging.getLogger(__name__)
                    
                    if sync_counter % 12 == 0:
                        logger.info("⏰ Ejecutando Sincronización Automática de Personas en background...")
                        sync_device_background()
                    
                    logger.info("⏰ Ejecutando Procesamiento de Ausencias Automático...")
                    call_command('procesar_faltas')
                    
                except Exception as e:
                    logger.error(f"Error en Background Tasks: {e}")
                
                sync_counter += 1
                # Dormir 1 hora
                time.sleep(60 * 60)
                
        thread = threading.Thread(target=run_background_tasks, daemon=True)
        thread.start()
