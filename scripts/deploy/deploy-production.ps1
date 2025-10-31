# 🚀 Правильный Production Деплой для Yandex Cloud (PowerShell)
# Использование: .\deploy-production.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$VMIP,
    
    [string]$SSHKey = "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347",
    [string]$Username = "ubuntu",
    [switch]$SkipSSL,
    [switch]$SkipFirewall
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
    throw $Message
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️ $Message" "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️ $Message" "Cyan"
}

# Проверка подключения к VM
function Test-VMConnection {
    Write-Info "Проверяем подключение к VM: $VMIP"
    
    try {
        $result = ssh -i $SSHKey -o ConnectTimeout=10 -o StrictHostKeyChecking=no $Username@$VMIP "echo 'Connection successful'" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Подключение к VM успешно"
            return $true
        } else {
            Write-Error "Не удалось подключиться к VM"
            return $false
        }
    } catch {
        Write-Error "Ошибка подключения: $($_.Exception.Message)"
        return $false
    }
}

# Загрузка правильной конфигурации на VM
function Deploy-ProductionConfig {
    Write-Info "Загружаем правильную production конфигурацию на VM..."
    
    # Создаем архив с правильными файлами
    $productionFiles = @(
        "docker-compose.production-full.yml",
        "Dockerfile.production-full", 
        "nginx/nginx-production.conf",
        "env.production.template",
        "deploy-production.sh",
        "monitoring/",
        "sql/"
    )
    
    $archiveName = "domeo-production-$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
    
    # Создаем архив
    $filesToArchive = @()
    foreach ($file in $productionFiles) {
        if (Test-Path $file) {
            if ((Get-Item $file) -is [System.IO.DirectoryInfo]) {
                Get-ChildItem $file -Recurse | ForEach-Object { $filesToArchive += $_.FullName }
            } else {
                $filesToArchive += (Get-Item $file).FullName
            }
        }
    }
    
    Compress-Archive -Path $filesToArchive -DestinationPath $archiveName -Force
    Write-Success "Архив создан: $archiveName"
    
    # Загружаем архив на VM
    scp -i $SSHKey -o StrictHostKeyChecking=no $archiveName $Username@$VMIP:/tmp/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Архив загружен на VM"
    } else {
        Write-Error "Ошибка загрузки архива"
    }
    
    # Распаковываем и настраиваем на VM
    $setupCommands = @"
cd /opt/domeo
rm -rf *
unzip /tmp/$archiveName
rm /tmp/$archiveName

# Создаем правильную структуру
mkdir -p nginx/ssl
mkdir -p data/{postgres,redis,uploads,logs,backups,prometheus,grafana,loki}
mkdir -p monitoring/{grafana/dashboards,grafana/datasources}

# Настраиваем права
chown -R ubuntu:ubuntu /opt/domeo
chmod +x *.sh

# Копируем конфигурацию
cp nginx/nginx-production.conf nginx/nginx.conf

echo "Production configuration deployed"
"@
    
    $setupCommands | ssh -i $SSHKey -o StrictHostKeyChecking=no $Username@$VMIP "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Production конфигурация развернута на VM"
    } else {
        Write-Error "Ошибка развертывания конфигурации"
    }
    
    # Удаляем локальный архив
    Remove-Item $archiveName -ErrorAction SilentlyContinue
}

# Настройка переменных окружения на VM
function Set-ProductionEnvironment {
    Write-Info "Настраиваем переменные окружения на VM..."
    
    $envCommands = @"
cd /opt/domeo

# Создаем production .env файл
cp env.production.template .env.production

# Генерируем безопасные пароли
POSTGRES_PASS=\$(openssl rand -base64 32)
REDIS_PASS=\$(openssl rand -base64 32)
NEXTAUTH_SECRET=\$(openssl rand -base64 32)
JWT_SECRET=\$(openssl rand -base64 32)
GRAFANA_PASS=\$(openssl rand -base64 16)

# Заменяем значения в .env.production
sed -i "s/your_secure_postgres_password_here/\$POSTGRES_PASS/" .env.production
sed -i "s/your_secure_redis_password_here/\$REDIS_PASS/" .env.production
sed -i "s/your_super_secret_nextauth_key_here_minimum_32_characters/\$NEXTAUTH_SECRET/" .env.production
sed -i "s/your_jwt_secret_key_here_minimum_32_characters/\$JWT_SECRET/" .env.production
sed -i "s/your_secure_grafana_password_here/\$GRAFANA_PASS/" .env.production
sed -i "s/yourdomain.com/$VMIP/" .env.production

# Устанавливаем права
chmod 600 .env.production

echo "Environment configured with secure passwords"
echo "PostgreSQL Password: \$POSTGRES_PASS"
echo "Redis Password: \$REDIS_PASS"
echo "NextAuth Secret: \$NEXTAUTH_SECRET"
echo "JWT Secret: \$JWT_SECRET"
echo "Grafana Password: \$GRAFANA_PASS"
"@
    
    $envCommands | ssh -i $SSHKey -o StrictHostKeyChecking=no $Username@$VMIP "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Переменные окружения настроены с безопасными паролями"
    } else {
        Write-Error "Ошибка настройки переменных окружения"
    }
}

# Запуск правильного production стека
function Start-ProductionStack {
    Write-Info "Запускаем правильный production стек..."
    
    $startCommands = @"
cd /opt/domeo

# Останавливаем старые контейнеры
docker-compose -f docker-compose.production-full.yml down 2>/dev/null || true

# Создаем SSL сертификаты для тестирования
if [ ! -f nginx/ssl/cert.pem ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=RU/ST=Moscow/L=Moscow/O=Domeo/OU=IT/CN=$VMIP"
fi

# Запускаем production стек
docker-compose -f docker-compose.production-full.yml up -d --build

# Ждем запуска сервисов
sleep 60

# Проверяем статус
docker-compose -f docker-compose.production-full.yml ps

echo "Production stack started"
"@
    
    $startCommands | ssh -i $SSHKey -o StrictHostKeyChecking=no $Username@$VMIP "bash"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Production стек запущен"
    } else {
        Write-Error "Ошибка запуска production стека"
    }
}

# Проверка работоспособности
function Test-ProductionHealth {
    Write-Info "Проверяем работоспособность production стека..."
    
    Start-Sleep -Seconds 30
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri "http://$VMIP/api/health" -Method GET -TimeoutSec 5
            if ($response.StatusCode -eq 204) {
                Write-Success "Приложение работает! Health check пройден"
                break
            }
        } catch {
            Write-Info "Попытка $attempt/$maxAttempts : приложение еще не готово..."
            Start-Sleep -Seconds 10
            $attempt++
        }
    }
    
    if ($attempt -gt $maxAttempts) {
        Write-Warning "Приложение не отвечает после $maxAttempts попыток"
    }
    
    # Проверяем другие сервисы
    try {
        Invoke-WebRequest -Uri "http://$VMIP:3001" -Method GET -TimeoutSec 5 | Out-Null
        Write-Success "Grafana доступен"
    } catch {
        Write-Warning "Grafana недоступен"
    }
    
    try {
        Invoke-WebRequest -Uri "http://$VMIP:9090" -Method GET -TimeoutSec 5 | Out-Null
        Write-Success "Prometheus доступен"
    } catch {
        Write-Warning "Prometheus недоступен"
    }
}

# Основная функция
function Main {
    Write-ColorOutput "🚀 Начинаем правильный production деплой на VM: $VMIP" "Magenta"
    
    # Проверяем наличие SSH ключа
    if (-not (Test-Path $SSHKey)) {
        Write-Error "SSH ключ не найден: $SSHKey"
    }
    
    # Проверяем подключение
    if (-not (Test-VMConnection)) {
        Write-Error "Не удалось подключиться к VM"
    }
    
    # Развертываем правильную конфигурацию
    Deploy-ProductionConfig
    
    # Настраиваем окружение
    Set-ProductionEnvironment
    
    # Запускаем production стек
    Start-ProductionStack
    
    # Проверяем работоспособность
    Test-ProductionHealth
    
    Write-Success "🎉 Правильный production деплой завершен!"
    Write-Success "🌐 Приложение доступно по адресу: http://$VMIP"
    Write-Success "📊 Grafana: http://$VMIP:3001"
    Write-Success "📈 Prometheus: http://$VMIP:9090"
    Write-Success "🔍 Health Check: http://$VMIP/api/health"
    Write-Success ""
    Write-Success "📋 Следующие шаги:"
    Write-Success "1. Настройте DNS для вашего домена"
    Write-Success "2. Получите реальные SSL сертификаты"
    Write-Success "3. Настройте мониторинг и алерты"
    Write-Success "4. Настройте автоматические бэкапы"
}

# Запуск основной функции
try {
    Main
} catch {
    Write-Error "Произошла ошибка: $($_.Exception.Message)"
    exit 1
}
