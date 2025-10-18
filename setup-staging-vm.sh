#!/bin/bash

# 🧪 Настройка тестовой среды на VM
# Использование: ./setup-staging-vm.sh

set -e

echo "🧪 Настройка тестовой среды на VM..."

# Проверяем наличие SSH ключа
if [ ! -f "staging_key" ]; then
    echo "❌ SSH ключ staging_key не найден"
    echo "Создайте файл staging_key с приватным ключом для доступа к staging VM"
    exit 1
fi

# Настройки staging VM (замените на ваши данные)
STAGING_HOST="staging.yourdomain.com"  # Замените на IP staging VM
STAGING_USER="ubuntu"
STAGING_PATH="/opt/domeo-staging"

echo "📡 Подключаемся к staging VM: $STAGING_HOST"

# Создаем директорию проекта на staging VM
ssh -i staging_key -o StrictHostKeyChecking=no $STAGING_USER@$STAGING_HOST << 'EOF'
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Устанавливаем Docker Compose
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Создаем директорию проекта
sudo mkdir -p /opt/domeo-staging
sudo chown $USER:$USER /opt/domeo-staging

# Настраиваем firewall
sudo ufw allow 22
sudo ufw allow 3001
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ Staging VM настроена!"
EOF

echo "📁 Копируем проект на staging VM..."

# Копируем проект на staging VM
rsync -avz -e "ssh -i staging_key -o StrictHostKeyChecking=no" \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude="uploads" \
    --exclude="*.db" \
    --exclude="*.log" \
    --exclude=".env" \
    --exclude="production_key" \
    --exclude="staging_key" \
    ./ $STAGING_USER@$STAGING_HOST:$STAGING_PATH/

echo "🔧 Настраиваем staging окружение..."

# Настраиваем staging окружение на VM
ssh -i staging_key -o StrictHostKeyChecking=no $STAGING_USER@$STAGING_HOST << EOF
cd $STAGING_PATH

# Создаем staging .env файл
cat > .env << 'ENVEOF'
# Staging Environment
NODE_ENV=staging
NEXT_PUBLIC_BASE_URL=http://$STAGING_HOST:3001

# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="staging-jwt-secret-key-change-in-production"

# File Storage
YANDEX_ACCESS_KEY_ID="your-access-key"
YANDEX_SECRET_ACCESS_KEY="your-secret-key"
YANDEX_BUCKET_NAME="domeo-staging"
YANDEX_REGION="ru-central1"

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
ENVEOF

# Устанавливаем зависимости
npm install

# Собираем проект
npm run build:staging

# Создаем systemd сервис для staging
sudo tee /etc/systemd/system/domeo-staging.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Domeo Staging Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$STAGING_PATH
Environment=NODE_ENV=staging
ExecStart=/usr/bin/npm run start:staging
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Перезагружаем systemd и запускаем сервис
sudo systemctl daemon-reload
sudo systemctl enable domeo-staging
sudo systemctl start domeo-staging

echo "✅ Staging сервис запущен!"
EOF

echo ""
echo "🎉 Тестовая среда настроена!"
echo ""
echo "📋 Информация о staging:"
echo "  🌐 URL: http://$STAGING_HOST:3001"
echo "  📁 Путь: $STAGING_PATH"
echo "  🔧 Сервис: domeo-staging"
echo ""
echo "🛠️ Управление staging сервисом:"
echo "  Запуск:   ssh -i staging_key $STAGING_USER@$STAGING_HOST 'sudo systemctl start domeo-staging'"
echo "  Остановка: ssh -i staging_key $STAGING_USER@$STAGING_HOST 'sudo systemctl stop domeo-staging'"
echo "  Статус:   ssh -i staging_key $STAGING_USER@$STAGING_HOST 'sudo systemctl status domeo-staging'"
echo "  Логи:     ssh -i staging_key $STAGING_USER@$STAGING_HOST 'sudo journalctl -u domeo-staging -f'"
echo ""
echo "🔄 Обновление staging:"
echo "  ./deploy-staging-safe.sh"
