á b# AsistencIA - Sistema de Gestión de Asistencias

Sistema automático de gestión de asistencias para instituciones educativas que utiliza reconocimiento facial y medición de temperatura.

## 🏗️ Arquitectura

- **Frontend**: React + TypeScript
- **Backend**: Django + Django REST Framework
- **Base de Datos**: MySQL
- **Broker MQTT**: Mosquitto
- **Terminal Biométrico**: B2002FR-8I-CM-BTM-L06
- **Contenedores**: Docker + Docker Compose

## 📋 Requisitos Previos

- Docker
- Docker Compose

## 🚀 Instalación y Uso

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd asistencIA
```

### 2. Configurar variables de entorno
```bash
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones
```

### 3. Iniciar el sistema
```bash
# Opción 1: Usar el script automático
./start.sh

# Opción 2: Comandos manuales
docker compose build
docker compose up -d
```

### 4. Acceder a los servicios

- **Frontend (React)**: http://localhost:8088
- **Backend (Django)**: http://localhost:8001
- **API REST**: http://localhost:8001/api
- **Admin Django**: http://localhost:8001/admin
- **phpMyAdmin**: http://localhost:8082

## 📊 Estructura del Proyecto

```
asistencIA/
├── backend/                 # Django backend
│   ├── asistencias/        # App principal
│   ├── asistencias_project/ # Configuración Django
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/               # React frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── docs/                   # Documentación
├── docker-compose.yml      # Orquestación de contenedores
├── start.sh               # Script de inicio
└── README.md
```

## 🔧 Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker compose logs -f

# Servicio específico
docker compose logs -f backend
docker compose logs -f frontend
```

### Detener servicios
```bash
docker compose down
```

### Reconstruir un servicio
```bash
docker compose build backend
docker compose up -d backend
```

### Acceder a un contenedor
```bash
docker compose exec backend bash
docker compose exec frontend sh
```

## 📝 Modelos de Datos

### Persona
- `id`: Identificador único
- `nombre`: Nombre completo
- `email`: Correo electrónico
- `tipoPersona`: Estudiante, Profesor, Administrativo
- `curso`: Curso al que pertenece (solo estudiantes)
- `fechaRegistro`: Fecha de registro en el sistema

### Asistencia
- `id`: Identificador único
- `persona`: Referencia a Persona
- `fechaHora`: Fecha y hora del registro
- `temperatura`: Temperatura medida
- `estado`: Presente, Ausente, Tardanza
- `observaciones`: Notas adicionales

## 🔌 API Endpoints

### Personas
- `GET /api/personas/` - Listar todas las personas
- `POST /api/personas/` - Crear nueva persona
- `GET /api/personas/{id}/` - Obtener persona específica
- `PUT /api/personas/{id}/` - Actualizar persona
- `DELETE /api/personas/{id}/` - Eliminar persona

### Asistencias
- `GET /api/asistencias/` - Listar todas las asistencias
- `POST /api/asistencias/` - Crear nueva asistencia
- `GET /api/asistencias/{id}/` - Obtener asistencia específica
- `PUT /api/asistencias/{id}/` - Actualizar asistencia
- `DELETE /api/asistencias/{id}/` - Eliminar asistencia

## 🔐 Autenticación y Permisos

El sistema incluye:
- Autenticación basada en roles
- Acceso diferenciado por tipo de usuario
- Protección contra registros duplicados (15 minutos)
- Logs de auditoría

## 🌡️ Integración MQTT

El sistema está preparado para recibir datos del terminal biométrico vía MQTT:
- Broker: Mosquitto (puerto 1884)
- Topics: `/asistencias/registro`
- Datos: ID de persona, temperatura, timestamp

## 🛠️ Desarrollo

### Backend (Django)
```bash
docker compose exec backend bash
python app/manage.py makemigrations
python app/manage.py migrate
python app/manage.py createsuperuser

# Comandos específicos del proyecto
python app/manage.py populate_db     # Poblar BD con datos de ejemplo
python app/manage.py mqtt_listener   # Escuchar mensajes MQTT
```

### Superusuario por defecto
- **Usuario**: javinnieto
- **Contraseña**: admin123
- **Acceso**: http://localhost:8000/admin

### Frontend (React)
```bash
docker compose exec frontend sh
npm install
npm start
```

## 📞 Soporte

Para reportar problemas o solicitar nuevas funcionalidades, crear un issue en el repositorio.

