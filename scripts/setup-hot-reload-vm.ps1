# Скрипт для настройки и запуска hot reload на ВМ (PowerShell)
# Использование: .\scripts\setup-hot-reload-vm.ps1 -Host "130.193.40.35" -User "ubuntu" -KeyPath ""

param(
    [string]$Host = "130.193.40.35",
    [string]$User = "ubuntu",
    [string]$KeyPath = "",
    [string]$StagingPath = "/opt/domeo"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🔥 НАСТРОЙКА HOT RELOAD НА ВМ" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Проверка наличия docker-compose.staging-dev.yml локально
if (-not (Test-Path "docker-compose.staging-dev.yml")) {
    Write-Host "❌ Файл docker-compose.staging-dev.yml не найден локально!" -ForegroundColor Red
    Write-Host "   Убедитесь, что вы находитесь в корне проекта" -ForegroundColor Yellow
    exit 1
}

# Копирование docker-compose.staging-dev.yml на ВМ
Write-Host "📤 Копирование docker-compose.staging-dev.yml на ВМ..." -ForegroundColor Yellow
if ($KeyPath) {
    scp -i $KeyPath docker-compose.staging-dev.yml "${User}@${Host}:${StagingPath}/" 2>&1 | Out-Null
} else {
    scp docker-compose.staging-dev.yml "${User}@${Host}:${StagingPath}/" 2>&1 | Out-Null
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Ошибка при копировании файла (возможно файл уже существует)" -ForegroundColor Yellow
}

# Копирование скрипта setup-hot-reload-vm.sh на ВМ
Write-Host "📤 Копирование скрипта настройки на ВМ..." -ForegroundColor Yellow
if ($KeyPath) {
    scp -i $KeyPath scripts/setup-hot-reload-vm.sh "${User}@${Host}:${StagingPath}/scripts/" 2>&1 | Out-Null
} else {
    scp scripts/setup-hot-reload-vm.sh "${User}@${Host}:${StagingPath}/scripts/" 2>&1 | Out-Null
}

# Выполнение настройки на ВМ
Write-Host "`n🚀 Выполнение настройки на ВМ..." -ForegroundColor Yellow
Write-Host "   Host: $Host" -ForegroundColor Gray
Write-Host "   Path: $StagingPath`n" -ForegroundColor Gray

if ($KeyPath) {
    $sshCommand = "ssh -i `"$KeyPath`" ${User}@${Host} 'cd $StagingPath && chmod +x scripts/setup-hot-reload-vm.sh && ./scripts/setup-hot-reload-vm.sh'"
} else {
    $sshCommand = "ssh ${User}@${Host} 'cd $StagingPath && chmod +x scripts/setup-hot-reload-vm.sh && ./scripts/setup-hot-reload-vm.sh'"
}

Invoke-Expression $sshCommand

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ НАСТРОЙКА ЗАВЕРШЕНА" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "🌐 Staging URL: http://$Host`:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Для применения изменений используйте:" -ForegroundColor Yellow
Write-Host "   .\scripts\git-sync-to-staging.ps1 `"Описание изменений`"" -ForegroundColor Gray
Write-Host ""

