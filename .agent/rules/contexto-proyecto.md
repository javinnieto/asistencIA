---
trigger: always_on
---

# Contexto del Proyecto AsistencIA

Esta regla contiene la información crítica sobre la infraestructura, tecnologías y convenciones del proyecto para asegurar consistencia en el desarrollo.

## Infraestructura y Puertos (Docker)

El proyecto utiliza Docker Compose para la orquestación. Los puertos expuestos en el host son:

- **Nginx (Frontend/Proxy)**: `8088`
- **Backend (Django API)**: `8001` (Interno: `8000`)
- **Base de Datos (MySQL)**: `3307` (Interno: `3306`)
- **phpMyAdmin**: `8082`
- **Mosquitto (MQTT)**: `1884` (TCP), `9002` (WebSockets)

## Stack Tecnológico

### Backend

- **Framework**: Django 4.2+ con Django REST Framework (DRF).
- **Autenticación**: SimpleJWT.
- **Base de Datos**: MySQL 8.0.
- **Mensajería**: MQTT (paho-mqtt) para eventos en tiempo real.
- **Otros**: Pillow para manejo de imágenes.

### Frontend

- **Framework**: React 18 con TypeScript.
- **Estilos**: Bootstrap 5 + Bootstrap Icons.
- **Comunicación**: Axios.
- **Visualización**: Recharts.
- **Exportación**: jspdf, xlsx, file-saver.

## Estándares y Convenciones

1.  **Skills Propias**: El proyecto cuenta con un sistema de habilidades en `.agent/skills/`:
    - antes que se ejecute un prompt, fijarse en esta carpeta para ver si aguna skill coincide y es válido usarla.
2.  **Docker-first**: Cualquier cambio en dependencias (Python o Node) debe reflejarse en `requirements.txt` o `package.json` y, si es necesario, reconstruir los contenedores.
3.  **URLs de API**: El frontend debe usar `REACT_APP_API_URL` (actualmente configurado a `http://localhost:8001/api`).
4.  **Autenticación**: Seguir el estándar JWT para todas las peticiones protegidas.
5.  **Documentación**: Todo cambio relevante que se haga en el proyecto tiene que estar documentado en el README.md o en la carpeta docs/ correspondiente.
6.  **Responsive design**: todo cambio en front que se haga tiene que estar pensado para funcionar tanto en computadores como en celulares, es decir tiene que ser responsive.

## Comandos Útiles

- Iniciar proyecto: `./start.sh` (o `docker-compose up -d`).
