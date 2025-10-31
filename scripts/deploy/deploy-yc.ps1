# 🚀 PowerShell скрипт для деплоя на YC VM
# Использование: .\deploy-yc.ps1 [staging|production]

param(
    [Parameter(Position=0)]
    [ValidateSet("staging", "production")]
    [string]$Environment = "production"
)

# Цвета для вывода
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Blue
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

Write-Log "🚀 Начинаем деплой на YC VM для окружения: $Environment"

# Конфигурация для разных окружений
if ($Environment -eq "staging") {
    $VM_HOST = if ($env:STAGING_HOST) { $env:STAGING_HOST } else { "89.169.189.66" }
    $VM_PORT = if ($env:STAGING_PORT) { $env:STAGING_PORT } else { "3001" }
    $VM_USER = if ($env:STAGING_USER) { $env:STAGING_USER } else { "ubuntu" }
    $VM_PATH = "/opt/domeo-staging"
} else {
    $VM_HOST = if ($env:PROD_HOST) { $env:PROD_HOST } else { "130.193.40.35" }
    $VM_PORT = if ($env:PROD_PORT) { $env:PROD_PORT } else { "3000" }
    $VM_USER = if ($env:PROD_USER) { $env:PROD_USER } else { "ubuntu" }
    $VM_PATH = "/opt/domeo"
}

# Проверяем переменные окружения
if (-not $env:VM_SSH_KEY) {
    Write-Error "VM_SSH_KEY не установлен"
    Write-Host "Установите: `$env:VM_SSH_KEY = '/path/to/ssh/key'"
    exit 1
}

if (-not (Test-Path $env:VM_SSH_KEY)) {
    Write-Error "SSH ключ не найден: $env:VM_SSH_KEY"
    exit 1
}

# Проверяем подключение к VM
Write-Log "🔍 Проверяем подключение к VM ($VM_HOST)..."
$connectionTest = ssh -i $env:VM_SSH_KEY -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "echo 'Connection OK'" 2>$null
if (-not $connectionTest) {
    Write-Error "Не удается подключиться к VM"
    exit 1
}

Write-Success "✅ Подключение к VM успешно"

# Создаем бэкап на VM
Write-Log "💾 Создаем бэкап на VM..."
$backupScript = @"
cd $VM_PATH
if [ -d ".next" ]; then
    tar -czf backup-`$(date +%Y%m%d_%H%M%S).tar.gz .next package.json package-lock.json prisma
    echo "✅ Бэкап создан"
else
    echo "⚠️ Папка .next не найдена, пропускаем бэкап"
fi
"@

ssh -i $env:VM_SSH_KEY -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" $backupScript

# Собираем проект локально
Write-Log "🔨 Собираем проект локально..."
if ($Environment -eq "staging") {
    npm run build:staging
} else {
    npm run build:prod
}

# Создаем архив для деплоя
Write-Log "📦 Создаем архив для деплоя..."
$filesToArchive = @(
    ".next",
    "package.json", 
    "package-lock.json",
    "prisma",
    "docker-compose.prod.yml",
    "Dockerfile",
    "nginx.conf",
    "env.production.example"
)

# Используем PowerShell для создания архива
Compress-Archive -Path $filesToArchive -DestinationPath "domeo-deploy.zip" -Force

# Загружаем архив на VM
Write-Log "📤 Загружаем архив на VM..."
scp -i $env:VM_SSH_KEY -o StrictHostKeyChecking=no "domeo-deploy.zip" "$VM_USER@$VM_HOST`:/tmp/"

# Деплоим на VM
Write-Log "🚀 Деплоим на VM..."
$deployScript = @"
set -e
cd $VM_PATH

# Останавливаем текущие контейнеры
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.prod.yml down || true
fi

# Распаковываем новый код
unzip -o /tmp/domeo-deploy.zip
rm /tmp/domeo-deploy.zip

# Устанавливаем production зависимости
npm ci --only=production

# Применяем миграции БД
npx prisma migrate deploy

# Запускаем контейнеры
docker-compose -f docker-compose.prod.yml up -d

# Ждем запуска
sleep 30

# Проверяем статус
docker-compose -f docker-compose.prod.yml ps
"@

ssh -i $env:VM_SSH_KEY -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" $deployScript

# Проверяем health check
Write-Log "🔍 Проверяем health check..."
Start-Sleep -Seconds 30
try {
    $response = Invoke-WebRequest -Uri "http://$VM_HOST`:$VM_PORT/api/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "✅ Деплой успешен!"
        Write-Success "🌐 Приложение доступно: http://$VM_HOST`:$VM_PORT"
    } else {
        throw "Health check failed"
    }
} catch {
    Write-Error "❌ Health check не прошел"
    
    # Откатываем изменения
    Write-Warning "🔄 Откатываем изменения..."
    $rollbackScript = @"
cd $VM_PATH
docker-compose -f docker-compose.prod.yml down
# Восстанавливаем из последнего бэкапа
BACKUP_FILE=`$(ls -t backup-*.tar.gz | head -n1)
if [ -n "`$BACKUP_FILE" ]; then
    tar -xzf "`$BACKUP_FILE"
    docker-compose -f docker-compose.prod.yml up -d
    echo "✅ Откат выполнен"
else
    echo "❌ Бэкап не найден"
fi
"@
    ssh -i $env:VM_SSH_KEY -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" $rollbackScript
    exit 1
}

# Очищаем локальные файлы
Remove-Item "domeo-deploy.zip" -Force

# Показываем статус
Write-Log "📊 Статус сервисов:"
ssh -i $env:VM_SSH_KEY -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "cd $VM_PATH && docker-compose -f docker-compose.prod.yml ps"

Write-Success "🎉 Деплой на YC VM завершен успешно!"
Write-Success "📊 Мониторинг: http://$VM_HOST`:$VM_PORT/api/health"
Write-Success "🔍 Логи: ssh -i $env:VM_SSH_KEY $VM_USER@$VM_HOST 'cd $VM_PATH && docker-compose -f docker-compose.prod.yml logs -f'"

