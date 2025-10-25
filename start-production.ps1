# Быстрый запуск Domeo в production режиме (PowerShell)

Write-Host "🚀 Запуск Domeo Production..." -ForegroundColor Green

# Проверка Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker не установлен!" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose не установлен!" -ForegroundColor Red
    exit 1
}

# Проверка переменных окружения
if (-not (Test-Path ".env.production")) {
    Write-Host "⚠️  Создание .env.production из примера..." -ForegroundColor Yellow
    Copy-Item "env.production" ".env.production"
    Write-Host "📝 Отредактируйте .env.production перед запуском!" -ForegroundColor Yellow
    exit 1
}

# Создание необходимых директорий
New-Item -ItemType Directory -Force -Path "backups", "logs", "uploads" | Out-Null

# Запуск сервисов
Write-Host "🐳 Запуск Docker сервисов..." -ForegroundColor Blue
docker-compose -f docker-compose.production.yml up -d

# Ожидание готовности
Write-Host "⏳ Ожидание готовности сервисов..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Проверка здоровья
Write-Host "🔍 Проверка здоровья приложения..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Domeo успешно запущен!" -ForegroundColor Green
        Write-Host "🌐 Приложение: http://localhost" -ForegroundColor Cyan
        Write-Host "📊 Grafana: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "📈 Prometheus: http://localhost:9090" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Приложение не отвечает!" -ForegroundColor Red
    Write-Host "📋 Логи:" -ForegroundColor Yellow
    docker-compose -f docker-compose.production.yml logs app
}
