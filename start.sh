#!/bin/bash

echo "🚀 Iniciando Sistema de Gestión de Asistencias..."

# Verificar Docker
DOCKER_PATH="$(which docker 2>/dev/null || command -v docker 2>/dev/null || echo /usr/bin/docker)"
if ! [ -x "$DOCKER_PATH" ]; then
    echo "❌ Docker no está instalado o no es ejecutable. Por favor instala Docker primero."
    exit 1
fi
echo "✅ Docker encontrado en: $DOCKER_PATH"

# Verificar docker compose o docker-compose (primero el moderno)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ docker compose/docker-compose no está instalado. Por favor instala Docker Compose."
    exit 1
fi

echo "📦 Construyendo contenedores..."
$COMPOSE_CMD build

echo "🔄 Iniciando servicios..."
$COMPOSE_CMD up -d

echo "⏳ Esperando que los servicios estén listos..."
sleep 10

echo "✅ Sistema iniciado correctamente!"
echo ""
echo "🌐 Servicios disponibles:"
echo "   - Frontend (React): http://localhost:3000"
echo "   - Backend (Django): http://localhost:8000"
echo "   - API: http://localhost:8000/api"
echo "   - Admin Django: http://localhost:8000/admin"
echo "   - phpMyAdmin: http://localhost:8080"
echo ""
echo "📊 Para ver los logs: $COMPOSE_CMD logs -f"
echo "🛑 Para detener: $COMPOSE_CMD down" 