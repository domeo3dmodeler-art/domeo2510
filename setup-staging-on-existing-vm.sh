#!/bin/bash

# 🧪 Настройка staging на существующей production VM
# Использование: ./setup-staging-on-existing-vm.sh

set -e

echo "🧪 Настройка staging на существующей production VM..."

# Настройки
PROD_HOST="130.193.40.35"
PROD_USER="ubuntu"
PROD_PATH="/opt/domeo"
STAGING_PATH="/opt/domeo-staging"
STAGING_PORT="3001"

echo "📡 Подключаемся к production VM: $PROD_HOST"

# Создаем staging директорию на существующей VM
ssh -i production_key -o StrictHostKeyChecking=no $PROD_USER@$PROD_HOST << EOF
# Создаем staging директорию
sudo mkdir -p $STAGING_PATH
sudo chown $PROD_USER:$PROD_USER $STAGING_PATH

# Копируем production код в staging
cp -r $PROD_PATH/* $STAGING_PATH/

# Создаем staging .env файл
cat > $STAGING_PATH/.env << 'ENVEOF'
# Staging Environment
NODE_ENV=staging
NEXT_PUBLIC_BASE_URL=http://$PROD_HOST:$STAGING_PORT

# Database (отдельная база для staging)
DATABASE_URL="file:./staging.db"

# JWT
JWT_SECRET="staging-jwt-secret-key"

# File Storage (тот же bucket, но с префиксом staging)
YANDEX_ACCESS_KEY_ID="your-access-key"
YANDEX_SECRET_ACCESS_KEY="your-secret-key"
YANDEX_BUCKET_NAME="domeo-production"
YANDEX_REGION="ru-central1"
YANDEX_PREFIX="staging/"

# Ports
PORT=$STAGING_PORT
ENVEOF

echo "✅ Staging директория создана"
EOF

# Копируем обновленный код на VM
echo "📁 Копируем код на VM..."
rsync -avz -e "ssh -i production_key -o StrictHostKeyChecking=no" \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude="uploads" \
    --exclude="*.db" \
    --exclude="*.log" \
    --exclude=".env" \
    ./ $PROD_USER@$PROD_HOST:$STAGING_PATH/

# Настраиваем staging сервис
echo "🔧 Настраиваем staging сервис..."
ssh -i production_key -o StrictHostKeyChecking=no $PROD_USER@$PROD_HOST << EOF
cd $STAGING_PATH

# Устанавливаем зависимости
npm install

# Собираем staging версию
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

echo "✅ Staging сервис запущен"
EOF

# Проверяем работу
echo "🔍 Проверяем работу staging..."
sleep 10

if curl -f http://$PROD_HOST:$STAGING_PORT/api/health; then
    echo "✅ Staging работает!"
else
    echo "❌ Staging не отвечает, проверяем логи..."
    ssh -i production_key -o StrictHostKeyChecking=no $PROD_USER@$PROD_HOST "sudo journalctl -u domeo-staging -n 20"
fi

echo ""
echo "🎉 Staging настроен на существующей VM!"
echo ""
echo "📋 Информация:"
echo "  🌐 Production: http://$PROD_HOST:3000"
echo "  🧪 Staging:   http://$PROD_HOST:$STAGING_PORT"
echo "  📁 Production: $PROD_PATH"
echo "  📁 Staging:   $STAGING_PATH"
echo ""
echo "🛠️ Управление staging:"
echo "  Статус: ssh -i production_key $PROD_USER@$PROD_HOST 'sudo systemctl status domeo-staging'"
echo "  Логи:   ssh -i production_key $PROD_USER@$PROD_HOST 'sudo journalctl -u domeo-staging -f'"
echo "  Рестарт: ssh -i production_key $PROD_USER@$PROD_HOST 'sudo systemctl restart domeo-staging'"
