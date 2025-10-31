# 🔄 Синхронизация изменений с production VM (PowerShell)
# Использование: .\sync-from-production.ps1

param(
    [string]$ProdHost = "130.193.40.35",
    [string]$ProdUser = "ubuntu",
    [string]$ProdPath = "/opt/domeo"
)

Write-Host "🔄 Синхронизация изменений с production VM: $ProdHost" -ForegroundColor Green

# Проверяем наличие SSH ключа
if (-not (Test-Path "production_key")) {
    Write-Host "❌ SSH ключ production_key не найден" -ForegroundColor Red
    Write-Host "Создайте файл production_key с приватным ключом для доступа к VM" -ForegroundColor Yellow
    exit 1
}

# Создаем временную директорию
$TempDir = "temp_production_sync"
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

Write-Host "📥 Скачиваем изменения с production VM..." -ForegroundColor Yellow

try {
    # Используем scp для скачивания файлов
    $scpCommand = "scp -i production_key -o StrictHostKeyChecking=no -r $ProdUser@${ProdHost}:$ProdPath/* $TempDir/"
    Invoke-Expression $scpCommand
    
    Write-Host "🔍 Анализируем изменения..." -ForegroundColor Yellow
    
    # Находим измененные файлы
    $ChangedFiles = Get-ChildItem -Path $TempDir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx", "*.json", "*.md" | 
        ForEach-Object { $_.FullName.Replace("$TempDir\", "") }
    
    Write-Host "📋 Найдены следующие измененные файлы:" -ForegroundColor Cyan
    $ChangedFiles | ForEach-Object { Write-Host "  📝 $_" -ForegroundColor White }
    
    Write-Host "🔄 Копируем изменения в локальный проект..." -ForegroundColor Yellow
    
    # Копируем изменения
    foreach ($file in $ChangedFiles) {
        $sourceFile = Join-Path $TempDir $file
        if (Test-Path $sourceFile) {
            Write-Host "  📝 Обновляем: $file" -ForegroundColor White
            Copy-Item $sourceFile $file -Force
        }
    }
    
    # Очищаем временные файлы
    Remove-Item -Recurse -Force $TempDir
    
    Write-Host "✅ Синхронизация завершена!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
    Write-Host "  1. Проверьте изменения: git diff" -ForegroundColor White
    Write-Host "  2. Добавьте файлы: git add ." -ForegroundColor White
    Write-Host "  3. Создайте коммит: git commit -m 'sync: production changes'" -ForegroundColor White
    Write-Host "  4. Отправьте изменения: git push origin feature/sync-production-changes" -ForegroundColor White
    Write-Host "  5. Создайте PR для мержа в develop" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 После мержа в develop изменения автоматически попадут на staging VM" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Ошибка при синхронизации: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Убедитесь что:" -ForegroundColor Yellow
    Write-Host "  - SSH ключ production_key существует и имеет правильные права" -ForegroundColor White
    Write-Host "  - VM доступна по адресу $ProdHost" -ForegroundColor White
    Write-Host "  - Пользователь $ProdUser имеет доступ к директории $ProdPath" -ForegroundColor White
}
