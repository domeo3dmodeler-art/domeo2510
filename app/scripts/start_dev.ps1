# scripts/start_dev.ps1
# PowerShell скрипт для запуска dev сервера

Write-Host "🚀 Запуск dev сервера для тестирования..." -ForegroundColor Green

# Проверяем, что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json не найден. Запустите скрипт из корня проекта." -ForegroundColor Red
    exit 1
}

# Устанавливаем переменные окружения
$env:PORT = if ($env:PORT) { $env:PORT } else { "3000" }
$env:NODE_ENV = "development"

Write-Host "📦 Установка зависимостей..." -ForegroundColor Yellow
npm install

Write-Host "🔨 Сборка проекта..." -ForegroundColor Yellow
npm run build

Write-Host "🚀 Запуск dev сервера на порту $env:PORT..." -ForegroundColor Green
Write-Host "📱 Откройте браузер: http://localhost:$env:PORT" -ForegroundColor Cyan
Write-Host "🛑 Для остановки нажмите Ctrl+C" -ForegroundColor Yellow

npm run dev
