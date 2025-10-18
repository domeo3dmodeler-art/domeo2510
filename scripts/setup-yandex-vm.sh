#!/bin/bash

# 🚀 Скрипт полной очистки и настройки Ubuntu VM для Yandex Cloud
# Использование: ./setup-yandex-vm.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Обновление системы
update_system() {
    log "Обновляем систему..."
    sudo apt update -y
    sudo apt upgrade -y
    sudo apt autoremove -y
    sudo apt autoclean
    log "✅ Система обновлена"
}

# Полная очистка системы
clean_system() {
    log "Выполняем полную очистку системы..."
    
    # Остановка всех сервисов
    sudo systemctl stop nginx 2>/dev/null || true
    sudo systemctl stop docker 2>/dev/null || true
    sudo systemctl stop postgresql 2>/dev/null || true
    sudo systemctl stop redis 2>/dev/null || true
    
    # Удаление всех пакетов
    sudo apt remove --purge -y \
        nginx \
        nginx-common \
        nginx-core \
        docker.io \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-compose \
        postgresql \
        postgresql-client \
        postgresql-contrib \
        redis-server \
        redis-tools \
        nodejs \
        npm \
        yarn \
        git \
        curl \
        wget \
        unzip \
        htop \
        vim \
        nano \
        2>/dev/null || true
    
    # Очистка конфигурационных файлов
    sudo rm -rf /etc/nginx
    sudo rm -rf /var/www
    sudo rm -rf /var/lib/docker
    sudo rm -rf /var/lib/postgresql
    sudo rm -rf /var/lib/redis
    sudo rm -rf /home/ubuntu/.docker
    sudo rm -rf /home/ubuntu/.npm
    sudo rm -rf /home/ubuntu/.yarn
    sudo rm -rf /home/ubuntu/.git
    
    # Очистка логов
    sudo rm -rf /var/log/nginx
    sudo rm -rf /var/log/docker
    sudo rm -rf /var/log/postgresql
    sudo rm -rf /var/log/redis
    
    # Очистка временных файлов
    sudo rm -rf /tmp/*
    sudo rm -rf /var/tmp/*
    
    # Очистка кэша пакетов
    sudo apt clean
    sudo apt autoremove -y
    sudo apt autoclean
    
    log "✅ Система полностью очищена"
}

# Установка необходимых пакетов
install_packages() {
    log "Устанавливаем необходимые пакеты..."
    
    # Базовые пакеты
    sudo apt update
    sudo apt install -y \
        curl \
        wget \
        git \
        unzip \
        htop \
        vim \
        nano \
        ufw \
        fail2ban \
        certbot \
        python3-certbot-nginx
    
    log "✅ Базовые пакеты установлены"
}

# Установка Docker
install_docker() {
    log "Устанавливаем Docker..."
    
    # Удаление старых версий
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Установка зависимостей
    sudo apt install -y \
        ca-certificates \
        gnupg \
        lsb-release
    
    # Добавление официального GPG ключа Docker
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Добавление репозитория Docker
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Обновление пакетов и установка Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Добавление пользователя в группу docker
    sudo usermod -aG docker ubuntu
    
    # Включение и запуск Docker
    sudo systemctl enable docker
    sudo systemctl start docker
    
    log "✅ Docker установлен"
}

# Установка Docker Compose
install_docker_compose() {
    log "Устанавливаем Docker Compose..."
    
    # Получение последней версии
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    # Скачивание и установка
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Создание символической ссылки
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log "✅ Docker Compose установлен (версия: $DOCKER_COMPOSE_VERSION)"
}

# Настройка файрвола
setup_firewall() {
    log "Настраиваем файрвол..."
    
    # Сброс правил
    sudo ufw --force reset
    
    # Настройка политик по умолчанию
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Разрешение SSH
    sudo ufw allow ssh
    
    # Разрешение HTTP и HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Разрешение портов для приложения (если нужно)
    sudo ufw allow 3000/tcp
    
    # Включение файрвола
    sudo ufw --force enable
    
    log "✅ Файрвол настроен"
}

# Настройка fail2ban
setup_fail2ban() {
    log "Настраиваем fail2ban..."
    
    # Создание конфигурации для SSH
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF
    
    # Перезапуск fail2ban
    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban
    
    log "✅ fail2ban настроен"
}

# Создание директории для приложения
create_app_directory() {
    log "Создаем директорию для приложения..."
    
    sudo mkdir -p /opt/domeo
    sudo chown ubuntu:ubuntu /opt/domeo
    
    log "✅ Директория создана: /opt/domeo"
}

# Настройка переменных окружения
setup_environment() {
    log "Создаем файл переменных окружения..."
    
    sudo tee /opt/domeo/.env.production > /dev/null <<EOF
# Production Environment Variables
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://domeo:your_password@db:5432/domeo

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production
NEXTAUTH_URL=https://yourdomain.com

# AWS/Yandex Object Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ru-central1
AWS_S3_BUCKET=your-bucket-name

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
EOF
    
    sudo chown ubuntu:ubuntu /opt/domeo/.env.production
    sudo chmod 600 /opt/domeo/.env.production
    
    log "✅ Файл переменных окружения создан"
}

# Создание systemd сервиса
create_systemd_service() {
    log "Создаем systemd сервис..."
    
    sudo tee /etc/systemd/system/domeo.service > /dev/null <<EOF
[Unit]
Description=Domeo Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/domeo
ExecStart=/usr/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable domeo.service
    
    log "✅ Systemd сервис создан"
}

# Создание скриптов управления
create_management_scripts() {
    log "Создаем скрипты управления..."
    
    # Скрипт запуска
    sudo tee /opt/domeo/start.sh > /dev/null <<'EOF'
#!/bin/bash
cd /opt/domeo
docker-compose -f docker-compose.production.yml up -d
echo "Domeo application started"
EOF
    
    # Скрипт остановки
    sudo tee /opt/domeo/stop.sh > /dev/null <<'EOF'
#!/bin/bash
cd /opt/domeo
docker-compose -f docker-compose.production.yml down
echo "Domeo application stopped"
EOF
    
    # Скрипт перезапуска
    sudo tee /opt/domeo/restart.sh > /dev/null <<'EOF'
#!/bin/bash
cd /opt/domeo
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
echo "Domeo application restarted"
EOF
    
    # Скрипт обновления
    sudo tee /opt/domeo/update.sh > /dev/null <<'EOF'
#!/bin/bash
cd /opt/domeo

echo "Stopping application..."
docker-compose -f docker-compose.production.yml down

echo "Pulling latest changes..."
git pull origin main

echo "Rebuilding and starting..."
docker-compose -f docker-compose.production.yml up -d --build

echo "Domeo application updated"
EOF
    
    # Скрипт проверки статуса
    sudo tee /opt/domeo/status.sh > /dev/null <<'EOF'
#!/bin/bash
cd /opt/domeo
echo "=== Docker Containers ==="
docker-compose -f docker-compose.production.yml ps

echo ""
echo "=== Application Health ==="
curl -f http://localhost:3000/api/health && echo "✅ Health OK" || echo "❌ Health FAILED"

echo ""
echo "=== Resource Usage ==="
docker stats --no-stream
EOF
    
    # Делаем скрипты исполняемыми
    sudo chmod +x /opt/domeo/*.sh
    sudo chown ubuntu:ubuntu /opt/domeo/*.sh
    
    log "✅ Скрипты управления созданы"
}

# Основная функция
main() {
    log "🚀 Начинаем настройку Ubuntu VM для Yandex Cloud"
    
    # Проверка прав root
    if [ "$EUID" -eq 0 ]; then
        error "Не запускайте скрипт от root. Используйте: sudo ./setup-yandex-vm.sh"
    fi
    
    update_system
    clean_system
    install_packages
    install_docker
    install_docker_compose
    setup_firewall
    setup_fail2ban
    create_app_directory
    setup_environment
    create_systemd_service
    create_management_scripts
    
    log "🎉 Настройка VM завершена!"
    log "📁 Директория приложения: /opt/domeo"
    log "🔧 Скрипты управления: /opt/domeo/*.sh"
    log "⚙️ Systemd сервис: domeo.service"
    log ""
    log "Следующие шаги:"
    log "1. Загрузите код приложения в /opt/domeo"
    log "2. Настройте переменные окружения в .env.production"
    log "3. Запустите приложение: sudo systemctl start domeo"
}

# Обработка ошибок
trap 'error "Произошла ошибка в строке $LINENO"' ERR

# Запуск основной функции
main "$@"
