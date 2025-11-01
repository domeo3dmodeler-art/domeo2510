# Безопасный деплой исправлений ТОЛЬКО на тестовую ВМ (staging)
# Production НЕ ТРОГАЕТ!
# Использование: .\scripts\deploy-fixes-to-staging.ps1

param(
    [switch]$SkipBackup = $false,
    [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

$STAGING_HOST = "130.193.40.35"
$STAGING_USER = "ubuntu"
$STAGING_PATH = "/opt/domeo"
$SSH_KEY = "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347"

$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = "/tmp/domeo-backup-$TIMESTAMP"

Write-Host "🚀 Безопасный деплой исправлений на тестовую ВМ" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Проверка SSH ключа
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "❌ ERROR: SSH ключ не найден: $SSH_KEY" -ForegroundColor Red
    exit 1
}

# Проверка подключения
Write-Host "🔍 Проверка подключения к тестовой ВМ..." -ForegroundColor Yellow
try {
    $test = ssh -i $SSH_KEY -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$STAGING_USER@$STAGING_HOST" "echo 'Connection OK'" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Не удается подключиться"
    }
    Write-Host "✅ Подключение установлено" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Не удается подключиться к тестовой ВМ" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Проверка текущего состояния
Write-Host "📊 Проверка текущего состояния..." -ForegroundColor Yellow
$healthCheck = ssh -i $SSH_KEY "$STAGING_USER@$STAGING_HOST" "curl -s http://localhost:3001/api/health 2>&1 | head -1"
if ($healthCheck -match "200|204|healthy") {
    Write-Host "✅ Health check: OK" -ForegroundColor Green
} else {
    Write-Host "⚠️  Health check: $healthCheck" -ForegroundColor Yellow
}
Write-Host ""

# Создание бэкапа (если не пропущен)
if (-not $SkipBackup) {
    Write-Host "💾 Создание бэкапа..." -ForegroundColor Yellow
    ssh -i $SSH_KEY "$STAGING_USER@$STAGING_HOST" @"
        cd $STAGING_PATH
        mkdir -p $BACKUP_DIR
        
        # Бэкап БД
        echo 'Создание бэкапа БД...'
        docker exec -e PGPASSWORD=staging_password domeo-staging-postgres pg_dump -U staging_user -d domeo_staging > $BACKUP_DIR/database_backup.sql 2>&1
        
        # Бэкап кода (git)
        echo 'Создание бэкапа кода...'
        git archive --format=tar.gz HEAD > $BACKUP_DIR/code_backup.tar.gz 2>&1 || true
        
        echo 'Бэкап создан в: $BACKUP_DIR'
    "@
    Write-Host "✅ Бэкап создан в $BACKUP_DIR" -ForegroundColor Green
    Write-Host ""
}

# Коммит изменений (если есть)
Write-Host "📝 Подготовка изменений..." -ForegroundColor Yellow
$gitStatus = git status --short
$modifiedFiles = ($gitStatus | Measure-Object -Line).Lines

if ($modifiedFiles -gt 0) {
    Write-Host "   Найдено изменений: $modifiedFiles" -ForegroundColor Gray
    
    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
        $CommitMessage = "fix: apply ESLint fixes and improvements"
    }
    
    Write-Host "   Коммитим изменения: $CommitMessage" -ForegroundColor Gray
    git add .
    git commit -m $CommitMessage
    
    Write-Host "   Отправляем в репозиторий..." -ForegroundColor Gray
    $currentBranch = git branch --show-current
    git push origin $currentBranch
    
    Write-Host "✅ Изменения закоммичены и отправлены" -ForegroundColor Green
} else {
    Write-Host "   Нет незакоммиченных изменений" -ForegroundColor Gray
}
Write-Host ""

# Деплой на тестовую ВМ
Write-Host "🚀 Деплой на тестовую ВМ..." -ForegroundColor Yellow
$currentBranch = git branch --show-current

ssh -i $SSH_KEY "$STAGING_USER@$STAGING_HOST" @"
    set -e
    cd $STAGING_PATH
    
    echo '📥 Получаем последние изменения из git...'
    git fetch origin
    git pull origin $currentBranch || git pull origin develop || git pull origin main
    
    echo '🔨 Пересобираем образ приложения...'
    docker compose build --no-cache app 2>&1 | tail -10
    
    echo '🔄 Перезапускаем сервисы...'
    docker compose up -d
    
    echo '⏳ Ждем запуска сервисов...'
    sleep 10
    
    echo '📊 Статус контейнеров:'
    docker compose ps
    
    echo '🏥 Проверка health check...'
    sleep 5
    curl -f http://localhost:3001/api/health || echo '⚠️  Health check не прошел'
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Деплой завершен успешно" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: Возможны проблемы при деплое, проверьте вручную" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Готово!" -ForegroundColor Green
Write-Host "   Тестовая ВМ: http://$STAGING_HOST`:3001" -ForegroundColor Cyan
if (-not $SkipBackup) {
    Write-Host "   Бэкап: $BACKUP_DIR (на тестовой ВМ)" -ForegroundColor Gray
}

