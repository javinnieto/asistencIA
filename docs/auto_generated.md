# AsistencIA - Documentación Automática

*Generado automáticamente el 2025-09-01 14:28:34*

## 📋 Información del Proyecto

- **Nombre**: AsistencIA
- **Descripción**: Sistema de gestión de asistencias automático con reconocimiento facial
- **Versión Django**: N/A
- **Debug Mode**: Activado

## 🗄️ Configuración de Base de Datos

- **Motor**: django.db.backends.mysql
- **Base de Datos**: asistencias
- **Host**: db
- **Puerto**: 3306

## 📦 Aplicaciones Instaladas

- `django.contrib.admin`
- `django.contrib.auth`
- `django.contrib.contenttypes`
- `django.contrib.sessions`
- `django.contrib.messages`
- `django.contrib.staticfiles`
- `rest_framework`
- `django_filters`
- `corsheaders`
- `asistencias`

## 🏗️ Modelos de Datos

### TipoPersona

**Tabla**: `asistencias_tipopersona`

**Campos**:

- `idTipoPersona` (AutoField) - **PRIMARY KEY** - unique
- `nombre` (CharField) - max_length: 50 - unique

### Curso

**Tabla**: `asistencias_curso`

**Campos**:

- `idCurso` (AutoField) - **PRIMARY KEY** - unique
- `nombre` (CharField) - max_length: 100

### Persona

**Tabla**: `asistencias_persona`

**Campos**:

- `idPersona` (IntegerField) - **PRIMARY KEY** - unique
- `nombre` (CharField) - max_length: 200
- `tipo` (ForeignKey)
- `curso` (ForeignKey) - nullable
- `cantRegistros` (IntegerField) - default: 0
- `nombreTerminal` (CharField) - max_length: 100 - nullable

**Relaciones**:
- `tipo` → TipoPersona
- `curso` → Curso

### EstadoAsistencia

**Tabla**: `asistencias_estadoasistencia`

**Campos**:

- `idEstadoAsistencia` (AutoField) - **PRIMARY KEY** - unique
- `nombre` (CharField) - max_length: 50
- `descripcion` (TextField) - max_length: 200 - nullable

### Asistencia

**Tabla**: `asistencias_asistencia`

**Campos**:

- `idAsistencia` (AutoField) - **PRIMARY KEY** - unique
- `persona` (ForeignKey)
- `fechaHora` (DateTimeField)
- `temperatura` (FloatField)
- `estado` (ForeignKey)
- `maskDetect` (BooleanField) - nullable
- `temperatureAlarm` (BooleanField) - nullable
- `verifyResult` (CharField) - max_length: 20 - nullable

**Relaciones**:
- `persona` → Persona
- `estado` → EstadoAsistencia

## 📡 Configuración MQTT

- **Broker**: mosquitto
- **Puerto**: 1883

## 🔗 Endpoints de API

### Autenticación
- `POST /api/token/` - Obtener token JWT
- `POST /api/token/refresh/` - Refrescar token JWT

### Recursos Principales
- `GET/POST /api/personas/` - Gestión de personas
- `GET/POST /api/asistencias/` - Gestión de asistencias
- `GET/POST /api/tipos-persona/` - Tipos de persona
- `GET/POST /api/cursos/` - Gestión de cursos
- `GET/POST /api/estados-asistencia/` - Estados de asistencia

### Documentación
- `GET /api/schema/` - Schema de la API
- `GET /admin/` - Panel de administración Django

## ⚙️ Comandos Disponibles

### Gestión de Base de Datos
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### MQTT y Documentación
```bash
python manage.py mqtt_listener  # Escuchar mensajes MQTT
python manage.py generate_docs  # Generar esta documentación
```

## 📁 Estructura de Archivos Importantes

```
backend/app/
├── core/
│   ├── settings.py      # Configuración principal
│   ├── urls.py          # URLs principales
│   └── token_serializers.py
├── asistencias/
│   ├── models.py        # Modelos de datos
│   ├── views.py         # Vistas de la API
│   ├── serializers.py   # Serializadores
│   ├── urls.py          # URLs de la app
│   └── management/commands/
│       ├── mqtt_listener.py    # Listener MQTT
│       └── generate_docs.py    # Este comando
└── manage.py
```

---
*Esta documentación se genera automáticamente. Para actualizarla, ejecuta:*
```bash
python manage.py generate_docs
```