#!/bin/bash
# Скрипт первоначальной настройки сервера для Yandex Cloud

set -e

echo "🚀 Первоначальная настройка сервера для Domeo Doors..."

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
echo "🔧 Установка необходимых пакетов..."
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx jq

# Установка Node.js 18
echo "📦 Установка Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2 для управления процессами
echo "⚙️ Установка PM2..."
sudo npm install -g pm2

# Создание пользователя для приложения
echo "👤 Настройка пользователя..."
sudo useradd -m -s /bin/bash domeo || true
sudo usermod -aG sudo domeo || true

# Создание директории для приложения
echo "📁 Создание директорий..."
sudo mkdir -p /opt/domeo-doors
sudo chown domeo:domeo /opt/domeo-doors

# Настройка файрвола
echo "🛡️ Настройка файрвола..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

# Настройка Nginx
echo "🌐 Настройка Nginx..."
sudo tee /etc/nginx/sites-available/domeo-doors > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/domeo-doors /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Настройка автозапуска Nginx
sudo systemctl enable nginx

# Создание systemd сервиса для приложения
echo "⚙️ Создание systemd сервиса..."
sudo tee /etc/systemd/system/domeo-doors.service > /dev/null << 'EOF'
[Unit]
Description=Domeo Doors Application
After=network.target

[Service]
Type=simple
User=domeo
WorkingDirectory=/opt/domeo-doors/app
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable domeo-doors

# Создание скрипта обновления
echo "📝 Создание скрипта обновления..."
sudo tee /opt/domeo-doors/update.sh > /dev/null << 'EOF'
#!/bin/bash
set -e

echo "🔄 Обновление Domeo Doors..."

cd /opt/domeo-doors/app

# Остановка сервиса
sudo systemctl stop domeo-doors

# Обновление кода
git pull origin main

# Установка зависимостей
npm ci --only=production

# Генерация Prisma клиента
npx prisma generate

# Применение миграций
npx prisma db push

# Сборка приложения
npm run build

# Запуск сервиса
sudo systemctl start domeo-doors

echo "✅ Обновление завершено!"
EOF

sudo chmod +x /opt/domeo-doors/update.sh
sudo chown domeo:domeo /opt/domeo-doors/update.sh

# Создание cron задачи для автоматических обновлений (опционально)
echo "⏰ Настройка автоматических обновлений..."
sudo tee /etc/cron.d/domeo-doors-update > /dev/null << 'EOF'
# Автоматическое обновление каждые 6 часов
0 */6 * * * domeo /opt/domeo-doors/update.sh >> /var/log/domeo-doors-update.log 2>&1
EOF

echo "✅ Первоначальная настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Склонируйте репозиторий: git clone <your-repo-url> /opt/domeo-doors"
echo "2. Настройте переменные окружения в .env.local"
echo "3. Запустите приложение: sudo systemctl start domeo-doors"
echo ""
echo "🌐 После настройки домена выполните:"
echo "sudo certbot --nginx -d your-domain.com"
