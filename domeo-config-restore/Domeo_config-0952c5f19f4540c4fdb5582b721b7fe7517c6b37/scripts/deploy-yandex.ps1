# Скрипт деплоя на Yandex Cloud для Windows PowerShell
# Использование: .\scripts\deploy-yandex.ps1 [environment]

param(
    [string]$Environment = "production"
)

# Установка строгого режима
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Функции для логирования
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        default { "Blue" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Write-Error-Log {
    param([string]$Message)
    Write-Log $Message "ERROR"
}

function Write-Success-Log {
    param([string]$Message)
    Write-Log $Message "SUCCESS"
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Log $Message "WARNING"
}

# Основные переменные
$ProjectName = "domeo-doors"
$ImageTag = "latest"
$AppDirectory = "app"

Write-Log "Начинаем деплой проекта $ProjectName в окружение $Environment"

# Проверка наличия необходимых файлов
$requiredFiles = @(
    "$AppDirectory/Dockerfile.yandex",
    "$AppDirectory/docker-compose.yandex.yml"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Error-Log "Файл $file не найден"
        exit 1
    }
}

# Переход в директорию приложения
Set-Location $AppDirectory

# Проверка переменных окружения
if (-not (Test-Path ".env.local")) {
    Write-Warning-Log "Файл .env.local не найден. Создайте его на основе env.yandex.example"
    if (Test-Path "env.yandex.example") {
        Copy-Item "env.yandex.example" ".env.local"
        Write-Warning-Log "Создан файл .env.local из env.yandex.example. Отредактируйте его перед продолжением."
        exit 1
    } else {
        Write-Error-Log "Файл env.yandex.example не найден"
        exit 1
    }
}

# Проверка наличия Docker
try {
    $dockerVersion = docker --version
    Write-Log "Docker найден: $dockerVersion"
} catch {
    Write-Error-Log "Docker не установлен или не доступен"
    exit 1
}

# Проверка наличия docker-compose
try {
    $composeVersion = docker-compose --version
    Write-Log "Docker Compose найден: $composeVersion"
} catch {
    Write-Error-Log "docker-compose не установлен или не доступен"
    exit 1
}

# Сборка Docker образа
Write-Log "Сборка Docker образа..."
try {
    docker build -f Dockerfile.yandex -t "$ProjectName`:$ImageTag" .
    Write-Success-Log "Docker образ собран успешно"
} catch {
    Write-Error-Log "Ошибка при сборке Docker образа"
    exit 1
}

# Запуск контейнеров
Write-Log "Запуск контейнеров..."
try {
    docker-compose -f docker-compose.yandex.yml up -d
    Write-Success-Log "Контейнеры запущены успешно"
} catch {
    Write-Error-Log "Ошибка при запуске контейнеров"
    exit 1
}

# Ожидание готовности приложения
Write-Log "Ожидание готовности приложения..."
Start-Sleep -Seconds 10

# Проверка health check
Write-Log "Проверка health check..."
$healthCheckPassed = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success-Log "Приложение готово к работе"
            $healthCheckPassed = $true
            break
        }
    } catch {
        # Игнорируем ошибки и продолжаем попытки
    }
    
    if ($i -eq 30) {
        Write-Error-Log "Приложение не отвечает на health check"
        exit 1
    }
    Start-Sleep -Seconds 2
}

# Выполнение миграций базы данных
Write-Log "Выполнение миграций базы данных..."
try {
    docker-compose -f docker-compose.yandex.yml exec app npx prisma migrate deploy
    Write-Success-Log "Миграции выполнены успешно"
} catch {
    Write-Error-Log "Ошибка при выполнении миграций"
    exit 1
}

# Генерация Prisma клиента
Write-Log "Генерация Prisma клиента..."
try {
    docker-compose -f docker-compose.yandex.yml exec app npx prisma generate
    Write-Success-Log "Prisma клиент сгенерирован успешно"
} catch {
    Write-Error-Log "Ошибка при генерации Prisma клиента"
    exit 1
}

# Проверка статуса контейнеров
Write-Log "Проверка статуса контейнеров..."
docker-compose -f docker-compose.yandex.yml ps

Write-Success-Log "Деплой завершен успешно!"
Write-Log "Приложение доступно по адресу: http://localhost:3000"
Write-Log "Health check: http://localhost:3000/api/health"

# Показать логи
$showLogs = Read-Host "Показать логи? (y/n)"
if ($showLogs -eq "y" -or $showLogs -eq "Y") {
    docker-compose -f docker-compose.yandex.yml logs -f
}

# Возврат в корневую директорию
Set-Location ..


