# Estructura del Proyecto

## Estructura de Carpetas

```
/asistencIA
  /backend      # Django
  /frontend     # React
  /docs         # Documentación y payloads
  /db_data      # Volumen para MySQL
  /backups      # Backups automáticos
  docker-compose.yml
  README.md
```

## Diagrama de Arquitectura

```mermaid
graph TD
  Terminal["Terminal Asistencia (MQTT)"]
  Mosquitto["Broker MQTT (Docker)"]
  Django["Backend Django (Docker)"]
  MySQL["MySQL (Docker)"]
  React["Frontend React (Docker)"]
  Preceptora["Preceptora/Personal (Web)"]

  Terminal -- MQTT --> Mosquitto
  Mosquitto -- Evento --> Django
  Django -- ORM --> MySQL
  Django -- API REST --> React
  React -- Web --> Preceptora
```

---

Iremos agregando aquí toda la información relevante sobre la estructura y arquitectura del proyecto.
