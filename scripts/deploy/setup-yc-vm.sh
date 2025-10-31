#!/bin/bash

# 🛠️ Настройка YC VM для Domeo
# Использование: ./setup-yc-vm.sh [staging|production]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверяем аргументы
ENVIRONMENT=${1:-production}
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Неверное окружение. Используйте: staging или production"
    exit 1
fi

log "🛠️ Настройка YC VM для окружения: $ENVIRONMENT"

# Конфигурация
if [[ "$ENVIRONMENT" == "staging" ]]; then
    VM_HOST=${STAGING_HOST:-"89.169.189.66"}
    VM_USER=${STAGING_USER:-"ubuntu"}
    VM_PATH="/opt/domeo-staging"
    VM_PORT="3001"
else
    VM_HOST=${PROD_HOST:-"130.193.40.35"}
    VM_USER=${PROD_USER:-"ubuntu"}
    VM_PATH="/opt/domeo"
    VM_PORT="3000"
fi

# Проверяем SSH ключ
if [[ -z "$VM_SSH_KEY" ]]; then
    error "VM_SSH_KEY не установлен"
    echo "Установите: export VM_SSH_KEY=/path/to/ssh/key"
    exit 1
fi

if [[ ! -f "$VM_SSH_KEY" ]]; then
    error "SSH ключ не найден: $VM_SSH_KEY"
    exit 1
fi

# Проверяем подключение
log "🔍 Проверяем подключение к VM..."
if ! ssh -i "$VM_SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "echo 'Connection OK'"; then
    error "Не удается подключиться к VM"
    exit 1
fi

success "✅ Подключение к VM успешно"

# Настраиваем VM
log "🛠️ Настраиваем VM..."
ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" << EOF
set -e

# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем необходимые пакеты
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nginx \
    ufw \
    fail2ban \
    certbot \
    python3-certbot-nginx

# Устанавливаем Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker \$USER
    rm get-docker.sh
fi

# Устанавливаем Docker Compose
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Устанавливаем Node.js 20
if ! command -v node &> /dev/null || [[ \$(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Устанавливаем PM2
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Создаем директории
sudo mkdir -p $VM_PATH
sudo mkdir -p $VM_PATH/logs
sudo mkdir -p $VM_PATH/uploads
sudo mkdir -p $VM_PATH/backups
sudo mkdir -p $VM_PATH/ssl

# Устанавливаем права
sudo chown -R \$USER:\$USER $VM_PATH

# Настраиваем firewall
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow $VM_PORT

# Настраиваем fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Создаем systemd сервис для PM2
sudo tee /etc/systemd/system/domeo.service > /dev/null << 'EOL'
[Unit]
Description=Domeo Application
After=network.target

[Service]
Type=forking
User=$VM_USER
WorkingDirectory=$VM_PATH
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always

[Install]
WantedBy=multi-user.target
EOL

# Создаем конфигурацию PM2
cat > $VM_PATH/ecosystem.config.js << 'EOL'
module.exports = {
  apps: [{
    name: 'domeo',
    script: 'server.js',
    cwd: '$VM_PATH',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $VM_PORT
    },
    error_file: '$VM_PATH/logs/err.log',
    out_file: '$VM_PATH/logs/out.log',
    log_file: '$VM_PATH/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
};
EOL

# Настраиваем логирование
sudo tee /etc/logrotate.d/domeo > /dev/null << 'EOL'
$VM_PATH/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $VM_USER $VM_USER
    postrotate
        /usr/bin/pm2 reloadLogs
    endscript
}
EOL

# Создаем скрипт мониторинга
cat > $VM_PATH/monitor.sh << 'EOL'
#!/bin/bash
echo "=== Domeo System Status ==="
echo "Date: \$(date)"
echo "Uptime: \$(uptime)"
echo "Memory: \$(free -h)"
echo "Disk: \$(df -h /)"
echo "Docker: \$(docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}')"
echo "PM2: \$(pm2 status)"
echo "Nginx: \$(systemctl is-active nginx)"
echo "Health Check: \$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$VM_PORT/api/health)"
EOL

chmod +x $VM_PATH/monitor.sh

# Создаем cron задачи
(crontab -l 2>/dev/null; echo "0 2 * * * $VM_PATH/monitor.sh >> $VM_PATH/logs/monitor.log") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * * docker system prune -f") | crontab -

echo "✅ VM настроена успешно"
EOF

success "✅ VM настроена успешно"

# Создаем инструкции
log "📋 Создаем инструкции по деплою..."
cat > "YC_DEPLOY_INSTRUCTIONS.md" << EOF
# 🚀 Инструкции по деплою на YC VM

## 📋 Предварительные требования

1. **SSH ключ** для доступа к VM
2. **Переменные окружения** настроены
3. **Домен** (опционально, для SSL)

## 🔧 Настройка переменных окружения

\`\`\`bash
# Основные переменные
export VM_SSH_KEY="/path/to/your/ssh/key"
export PROD_HOST="130.193.40.35"  # IP вашей VM
export PROD_USER="ubuntu"

# Для staging
export STAGING_HOST="89.169.189.66"
export STAGING_USER="ubuntu"

# Переменные окружения приложения (создайте .env.production)
POSTGRES_PASSWORD=your_secure_password
NEXTAUTH_SECRET=your_nextauth_secret_min_32_chars
YANDEX_STORAGE_ACCESS_KEY=your_access_key
YANDEX_STORAGE_SECRET_KEY=your_secret_key
YANDEX_STORAGE_BUCKET=your-bucket-name
\`\`\`

## 🚀 Деплой

### 1. Настройка VM (выполнить один раз)
\`\`\`bash
chmod +x setup-yc-vm.sh
./setup-yc-vm.sh production
\`\`\`

### 2. Деплой приложения
\`\`\`bash
chmod +x deploy-yc.sh
./deploy-yc.sh production
\`\`\`

## 🔍 Мониторинг

### Проверка статуса
\`\`\`bash
ssh -i \$VM_SSH_KEY \$PROD_USER@\$PROD_HOST "cd /opt/domeo && ./monitor.sh"
\`\`\`

### Просмотр логов
\`\`\`bash
ssh -i \$VM_SSH_KEY \$PROD_USER@\$PROD_HOST "cd /opt/domeo && docker-compose -f docker-compose.prod.yml logs -f"
\`\`\`

### PM2 статус
\`\`\`bash
ssh -i \$VM_SSH_KEY \$PROD_USER@\$PROD_HOST "pm2 status"
\`\`\`

## 🔒 SSL сертификат (опционально)

\`\`\`bash
ssh -i \$VM_SSH_KEY \$PROD_USER@\$PROD_HOST "sudo certbot --nginx -d your-domain.com"
\`\`\`

## 🆘 Troubleshooting

### Перезапуск сервисов
\`\`\`bash
ssh -i \$VM_SSH_KEY \$PROD_USER@\$PROD_HOST "cd /opt/domeo && docker-compose -f docker-compose.prod.yml restart"
\`\`\`

### Откат к предыдущей версии
\`\`\`bash
ssh -i \$VM_SSH_KEY \$PROD_USER@\$PROD_HOST "cd /opt/domeo && tar -xzf backup-YYYYMMDD_HHMMSS.tar.gz"
\`\`\`

## 📊 Полезные команды

- **Статус системы**: \`htop\`
- **Использование диска**: \`df -h\`
- **Память**: \`free -h\`
- **Docker контейнеры**: \`docker ps\`
- **Nginx статус**: \`systemctl status nginx\`
EOF

success "✅ Инструкции созданы: YC_DEPLOY_INSTRUCTIONS.md"

log "🎉 Настройка YC VM завершена!"
log "📋 Следующие шаги:"
log "1. Настройте переменные окружения"
log "2. Запустите: ./setup-yc-vm.sh $ENVIRONMENT"
log "3. Запустите: ./deploy-yc.sh $ENVIRONMENT"
log "4. Проверьте: http://$VM_HOST:$VM_PORT/api/health"

