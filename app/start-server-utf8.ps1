# PowerShell скрипт для запуска сервера с правильной кодировкой
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:NODE_OPTIONS="--max-old-space-size=4096"
$env:LANG="ru_RU.UTF-8"
$env:LC_ALL="ru_RU.UTF-8"
$env:NODE_ENV="development"

Write-Host "🚀 Запуск сервера с правильной кодировкой..." -ForegroundColor Green
Write-Host "NODE_OPTIONS: $env:NODE_OPTIONS" -ForegroundColor Yellow
Write-Host "LANG: $env:LANG" -ForegroundColor Yellow
Write-Host "LC_ALL: $env:LC_ALL" -ForegroundColor Yellow
Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor Yellow

# Тест кириллицы
Write-Host "`n🔤 Тест кириллицы:" -ForegroundColor Cyan
Write-Host "Современная: Современная" -ForegroundColor White
Write-Host "ПВХ: ПВХ" -ForegroundColor White
Write-Host "Белый: Белый" -ForegroundColor White
Write-Host "Базовый: Базовый" -ForegroundColor White

Write-Host "`n📦 Запуск Next.js сервера..." -ForegroundColor Green
npm run dev
