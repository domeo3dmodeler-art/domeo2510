# 🚀 Быстрый запуск локальной разработки
# Использование: .\scripts\dev-local-quick.ps1

Write-Host "🚀 Быстрый запуск локальной разработки..." -ForegroundColor Green

# Проверяем наличие .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  Файл .env.local не найден!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Создайте .env.local со следующим содержимым:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "# Для подключения к staging БД через SSH туннель:" -ForegroundColor Gray
    Write-Host "# Сначала создайте туннель: ssh -L 5433:localhost:5432 ubuntu@130.193.40.35" -ForegroundColor Gray
    Write-Host "DATABASE_URL=`"postgresql://staging_user:staging_password@localhost:5433/domeo_staging?schema=public`"" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Или создайте локальную БД через Docker:" -ForegroundColor Cyan
    Write-Host "docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=domeo_local postgres:15" -ForegroundColor Gray
    Write-Host "DATABASE_URL=`"postgresql://postgres:postgres@localhost:5432/domeo_local?schema=public`"" -ForegroundColor Gray
    Write-Host ""
    
    $create = Read-Host "Создать .env.local сейчас? (y/n)"
    if ($create -eq "y") {
        $dbUrl = Read-Host "Введите DATABASE_URL"
        @"
DATABASE_URL="$dbUrl"
NEXTAUTH_SECRET="local-dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-Host "✅ Файл .env.local создан" -ForegroundColor Green
    } else {
        Write-Host "❌ Не могу продолжить без .env.local" -ForegroundColor Red
        exit 1
    }
}

# Проверяем Node.js
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js версия: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js не установлен" -ForegroundColor Red
    exit 1
}

# Устанавливаем зависимости если нужно
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Устанавливаем зависимости..." -ForegroundColor Yellow
    npm install
}

# Генерируем Prisma клиент
Write-Host "🗄️ Генерируем Prisma клиент..." -ForegroundColor Yellow
npm run prisma:generate

# Запускаем dev сервер
Write-Host ""
Write-Host "🚀 Запускаем dev сервер с hot reload..." -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Приложение будет доступно по адресу: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔥 Hot reload включен - изменения применяются мгновенно!" -ForegroundColor Cyan
Write-Host "📊 Prisma Studio: npm run prisma:studio (в другом терминале)" -ForegroundColor Cyan
Write-Host "🛑 Для остановки: Ctrl+C" -ForegroundColor Cyan
Write-Host ""

npm run dev

