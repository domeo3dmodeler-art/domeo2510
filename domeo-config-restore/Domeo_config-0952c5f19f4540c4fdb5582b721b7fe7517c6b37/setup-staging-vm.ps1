# 🧪 Настройка staging VM (PowerShell)
# Использование: .\setup-staging-vm.ps1

param(
    [string]$StagingHost = "89.169.189.66",
    [string]$StagingUser = "ubuntu",
    [string]$StagingPath = "/opt/domeo-staging"
)

Write-Host "🧪 Настройка staging VM: $StagingHost" -ForegroundColor Green

# Проверяем наличие SSH ключа
if (-not (Test-Path "staging_key")) {
    Write-Host "❌ SSH ключ staging_key не найден" -ForegroundColor Red
    Write-Host "Скопируйте приватный SSH ключ в файл staging_key" -ForegroundColor Yellow
    Write-Host "Путь к приватному ключу: C:\Users\petr2\.ssh\ssh-key-1760763840626" -ForegroundColor Yellow
    exit 1
}

Write-Host "📡 Подключаемся к staging VM: $StagingHost" -ForegroundColor Yellow

try {
    # Проверяем подключение
    Write-Host "🔍 Проверяем подключение..." -ForegroundColor Yellow
    $testConnection = ssh -i staging_key -o ConnectTimeout=10 -o StrictHostKeyChecking=no $StagingUser@$StagingHost "echo 'Connection OK'"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Не удается подключиться к staging VM"
    }
    
    Write-Host "✅ Подключение успешно" -ForegroundColor Green
    
    # Настраиваем VM
    Write-Host "⚙️ Настраиваем staging VM..." -ForegroundColor Yellow
    ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost @"
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Устанавливаем PM2
sudo npm install -g pm2

# Создаем директорию проекта
sudo mkdir -p $StagingPath
sudo chown $StagingUser:$StagingUser $StagingPath

# Настраиваем firewall
sudo ufw allow 22
sudo ufw allow 3001
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "✅ Staging VM настроена!"
"@

    # Копируем проект
    Write-Host "📁 Копируем проект на staging VM..." -ForegroundColor Yellow
    $rsyncCommand = "rsync -avz -e `"ssh -i staging_key -o StrictHostKeyChecking=no`" --exclude=`"node_modules`" --exclude=`".next`" --exclude=`"uploads`" --exclude=`"*.db`" --exclude=`"*.log`" --exclude=`".env`" --exclude=`"production_key`" --exclude=`"staging_key`" ./ $StagingUser@${StagingHost}:$StagingPath/"
    
    # Используем scp вместо rsync для Windows
    Write-Host "📤 Загружаем файлы проекта..." -ForegroundColor Yellow
    $tempArchive = "staging-project.tar.gz"
    
    # Создаем архив
    tar -czf $tempArchive --exclude="node_modules" --exclude=".next" --exclude="uploads" --exclude="*.db" --exclude="*.log" --exclude=".env" --exclude="production_key" --exclude="staging_key" .
    
    # Загружаем архив
    scp -i staging_key -o StrictHostKeyChecking=no $tempArchive $StagingUser@${StagingHost}:/tmp/
    
    # Распаковываем на VM
    ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost @"
cd $StagingPath
tar -xzf /tmp/staging-project.tar.gz
rm /tmp/staging-project.tar.gz
"@
    
    # Настраиваем staging окружение
    Write-Host "🔧 Настраиваем staging окружение..." -ForegroundColor Yellow
    ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost @"
cd $StagingPath

# Создаем staging .env файл
cat > .env << 'ENVEOF'
# Staging Environment
NODE_ENV=staging
NEXT_PUBLIC_BASE_URL=http://$StagingHost:3001

# Database
DATABASE_URL="file:./staging.db"

# JWT
JWT_SECRET="staging-jwt-secret-key-change-in-production"

# File Storage
YANDEX_ACCESS_KEY_ID="your-access-key"
YANDEX_SECRET_ACCESS_KEY="your-secret-key"
YANDEX_BUCKET_NAME="domeo-staging"
YANDEX_REGION="ru-central1"

# Port
PORT=3001
ENVEOF

# Устанавливаем зависимости
npm install

# Собираем проект
npm run build:staging

# Создаем systemd сервис
sudo tee /etc/systemd/system/domeo-staging.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=Domeo Staging Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$StagingPath
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
"@

    # Проверяем работу
    Write-Host "🔍 Проверяем работу staging..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    try {
        $healthCheck = Invoke-WebRequest -Uri "http://$StagingHost:3001/api/health" -TimeoutSec 10
        if ($healthCheck.StatusCode -eq 200) {
            Write-Host "✅ Staging работает корректно!" -ForegroundColor Green
        } else {
            throw "Health check failed"
        }
    } catch {
        Write-Host "❌ Staging не отвечает, проверяем логи..." -ForegroundColor Red
        ssh -i staging_key -o StrictHostKeyChecking=no $StagingUser@$StagingHost "sudo journalctl -u domeo-staging -n 20"
    }
    
    # Очищаем временные файлы
    Remove-Item $tempArchive -Force -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "🎉 Staging VM настроена успешно!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Информация:" -ForegroundColor Cyan
    Write-Host "  🌐 Staging URL: http://$StagingHost:3001" -ForegroundColor White
    Write-Host "  📁 Путь: $StagingPath" -ForegroundColor White
    Write-Host "  🔧 Сервис: domeo-staging" -ForegroundColor White
    Write-Host ""
    Write-Host "🛠️ Управление staging:" -ForegroundColor Cyan
    Write-Host "  Статус: ssh -i staging_key $StagingUser@$StagingHost 'sudo systemctl status domeo-staging'" -ForegroundColor White
    Write-Host "  Логи:   ssh -i staging_key $StagingUser@$StagingHost 'sudo journalctl -u domeo-staging -f'" -ForegroundColor White
    Write-Host "  Рестарт: ssh -i staging_key $StagingUser@$StagingHost 'sudo systemctl restart domeo-staging'" -ForegroundColor White
    
} catch {
    Write-Host "❌ Ошибка при настройке staging VM: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Убедитесь что:" -ForegroundColor Yellow
    Write-Host "  - SSH ключ staging_key существует и имеет правильные права" -ForegroundColor White
    Write-Host "  - VM доступна по адресу $StagingHost" -ForegroundColor White
    Write-Host "  - Пользователь $StagingUser имеет права sudo" -ForegroundColor White
}
