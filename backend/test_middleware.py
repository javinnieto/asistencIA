import json
import logging

logger = logging.getLogger(__name__)

class LoggerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/personas/59/') and request.method == 'PUT':
            logger.error(f">>>>> PAYLOAD RECEIVED: {request.body}")
        response = self.get_response(request)
        return response
