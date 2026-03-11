from django.apps import AppConfig


class AsistenciasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'asistencias'
    verbose_name = 'Gestión de Asistencias'

    def ready(self):
        import sys
        # Avoid starting the thread twice in dev (runserver reload) or during migrations
        if 'runserver' not in sys.argv and 'wsgi' not in sys.argv and 'gunicorn' not in sys.argv:
            return
            
        from django.conf import settings
        import threading
        
        def run_periodic_sync():
            import time
            from asistencias.views import sync_device_background
            
            # Esperar 60 segundos antes de la primera ejecución para dar tiempo a que inicie la DB
            time.sleep(60)
            while True:
                try:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info("⏰ Ejecutando Sincronización Automática de Personas en background...")
                    sync_device_background()
                except Exception as e:
                    logger.error(f"Error en Auto-Sync: {e}")
                
                # Dormir 12 horas
                time.sleep(12 * 60 * 60)
                
        thread = threading.Thread(target=run_periodic_sync, daemon=True)
        thread.start()
