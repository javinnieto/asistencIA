# Documentación Técnica del Protocolo MQTT - Terminal V1.24

Este documento resume los hallazgos tras analizar el archivo `Terminal MQTT Protocol V1.24.pdf`.

## 1. Puntos Críticos del Protocolo

### 1.1. Evento de Asistencia (Validación de Acceso)

El evento principal para registrar asistencia es cuando el terminal reconoce un rostro y envía un mensaje MQTT.

- **Tópico**: `mqtt/face/{device_id}/RecPush` (o similar, el documento usa subtopicos).
- **Operador (`operator`)**: El valor clave que identifica este evento es **`"RecPush"`**.
- **Datos del Mensaje (`info`)**:
  - **Identificador**: `personId` (numérico, crítico para vincular con BD).
  - **Nombre**: El documento especifica el campo **`"Persistname"`** (¡No `persionName`!).
  - **Estado**: `VerifyStatus`. Valores documentados: `0` a `3`. Generalmente `1` es éxito.
  - **Tiempo**: `time`. Formato `YYYY-MM-DD HH:MM:SS`.
  - **Temperatura**: `temperature` (decimal).

### 1.2. Otros Comandos Relevantes

- **Gestión de Personas**: `EditPerson`, `DeletePerson`.
- **Gestión de Fotos**: `GetPersonList`, `UpdateLogo`.
- **Control Remoto**: `OpenDoor` (abrir puerta remotamente).

## 2. Implementación de Sincronización y Borrado

### 2.1. Sincronización Periódica (1 hora)

Sí, es posible y recomendable.
**Estrategia**:

1.  Crear una tarea programada (Cron o Celery Beat) en Django.
2.  La tarea debe:
    - Consultar la lista de personas en la BD local.
    - Enviar comando `GetPersonList` al terminal vía MQTT.
    - Comparar listas (IDs).
    - Si falta alguien en el terminal: Enviar comando `EditPerson` (crear/actualizar).
    - Si sobra alguien en el terminal: Enviar comando `DeletePerson`.

### 2.2. Borrado de Personas

Existe un comando explícito en el protocolo para borrar usuarios del terminal.

**Comando MQTT**:

```json
{
  "operator": "DeletePerson",
  "info": {
    "personId": "42", // ID a borrar
    "deleteType": 2 // 2=Borrar persona + foto + registro
  }
}
```

**Implementación en Django**:
Podemos usar las `signals` de Django (`post_delete` en el modelo `Persona`) para que cuando borres a alguien del Admin, automáticamente se envíe este mensaje MQTT al terminal.

## 3. Comandos Útiles Detectados

- **Reiniciar Dispositivo**: `Reboot`.
- **Calibrar Hora**: `SetTime`.
- **Bloquear/Desbloquear**: `SetDoorStatus`.
