#!/bin/bash

echo "🚀 Iniciando Sistema de Gestión de Asistencias..."

# Función para detectar el sistema operativo
detect_os() {
    # Verificar si existe el archivo de release
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="$ID"
        OS_ID_LIKE="$ID_LIKE"
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS_ID="$DISTRIB_ID"
    else
        OS_ID=$(uname -s)
    fi
    
    # Convertir a minúsculas para comparación
    OS_ID=$(echo "$OS_ID" | tr '[:upper:]' '[:lower:]')
    OS_ID_LIKE=$(echo "$OS_ID_LIKE" | tr '[:upper:]' '[:lower:]')
    
    # Detectar sistema operativo
    if [[ "$OS_ID" == "ubuntu" ]] || [[ "$OS_ID" == "mint" ]] || [[ "$OS_ID" == "linuxmint" ]] || [[ "$OS_ID_LIKE" == *"ubuntu"* ]] || [[ "$OS_ID_LIKE" == *"debian"* ]]; then
        if command -v apt-get &> /dev/null; then
            echo "ubuntu"
        fi
    elif [[ "$OS_ID" == "centos" ]] || [[ "$OS_ID" == "rhel" ]] || [[ "$OS_ID_LIKE" == *"rhel"* ]]; then
        if command -v yum &> /dev/null; then
            echo "centos"
        fi
    elif [[ "$OS_ID" == "fedora" ]] || [[ "$OS_ID_LIKE" == *"fedora"* ]]; then
        if command -v dnf &> /dev/null; then
            echo "fedora"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        # Fallback: detectar por gestor de paquetes
        if command -v apt-get &> /dev/null; then
            echo "ubuntu"
        elif command -v yum &> /dev/null; then
            echo "centos"
        elif command -v dnf &> /dev/null; then
            echo "fedora"
        else
            echo "unknown"
        fi
    fi
}

# Función para instalar Docker
install_docker() {
    local os=$(detect_os)
    echo "🐳 Instalando Docker..."
    echo "📋 Sistema detectado: $os"
    
    case $os in
        "ubuntu")
            echo "🔧 Usando instalación para Ubuntu/Debian/Linux Mint..."
            sudo apt-get update
            sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo usermod -aG docker $USER
            ;;
        "centos")
            echo "🔧 Usando instalación para CentOS/RHEL..."
            sudo yum install -y yum-utils
            sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            ;;
        "fedora")
            echo "🔧 Usando instalación para Fedora..."
            sudo dnf -y install dnf-plugins-core
            sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            ;;
        "macos")
            echo "📱 Para macOS, por favor instala Docker Desktop desde:"
            echo "   https://www.docker.com/products/docker-desktop"
            echo "   O usa Homebrew: brew install docker"
            exit 1
            ;;
        *)
            echo "❌ Sistema operativo no soportado para instalación automática"
            echo "   Por favor instala Docker manualmente desde: https://docs.docker.com/get-docker/"
            exit 1
            ;;
    esac
}

# Función para instalar Docker Compose (versión standalone)
install_docker_compose() {
    echo "🐙 Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

# Verificar Docker
DOCKER_PATH="$(which docker 2>/dev/null || command -v docker 2>/dev/null || echo /usr/bin/docker)"
if ! [ -x "$DOCKER_PATH" ]; then
    echo "❌ Docker no encontrado. Instalando automáticamente..."
    install_docker
    echo "✅ Docker instalado. Por favor, cierra sesión y vuelve a entrar, o ejecuta:"
    echo "   newgrp docker"
    echo "   Luego ejecuta este script nuevamente."
    exit 0
else
    echo "✅ Docker encontrado en: $DOCKER_PATH"
fi

# Verificar que Docker esté corriendo
if ! docker info &> /dev/null; then
    echo "🔄 Iniciando Docker..."
    sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || echo "⚠️ No se pudo iniciar Docker automáticamente"
    sleep 3
    if ! docker info &> /dev/null; then
        echo "❌ Docker no está corriendo. Por favor inicia Docker manualmente."
        exit 1
    fi
fi

# Verificar docker compose o docker-compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose no encontrado. Instalando automáticamente..."
    install_docker_compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "❌ No se pudo instalar Docker Compose. Por favor instala manualmente."
        exit 1
    fi
fi

echo "✅ Docker Compose encontrado: $COMPOSE_CMD"

# Parámetro opcional para limpieza completa
if [ "$1" = "--clean" ]; then
    echo "🗑️ Modo limpieza activado - eliminando contenedores e imágenes..."
    $COMPOSE_CMD down --rmi all --volumes --remove-orphans
    echo "📦 Reconstruyendo imágenes desde cero..."
    $COMPOSE_CMD build --no-cache
else
    echo "📦 Construyendo contenedores..."
    $COMPOSE_CMD build
fi

echo "🔄 Iniciando servicios..."
$COMPOSE_CMD up -d

echo "⏳ Esperando que los servicios estén listos..."
sleep 15

echo "✅ Sistema iniciado correctamente!"
echo ""
echo "🌐 Servicios disponibles:"
echo "   - Frontend (React): http://localhost:3000"
echo "   - Backend (Django): http://localhost:8000"
echo "   - API: http://localhost:8000/api"
echo "   - Admin Django: http://localhost:8000/admin"
echo "   - phpMyAdmin: http://localhost:8080"
echo ""
echo "👨‍💻 Para crear un usuario administrador:"
echo "   $COMPOSE_CMD exec backend python app/manage.py createsuperuser"
echo ""
echo "📊 Para ver los logs: $COMPOSE_CMD logs -f"
echo "🛑 Para detener: $COMPOSE_CMD down"
echo ""
echo "💡 Si tienes problemas, ejecuta: ./start.sh --clean" 