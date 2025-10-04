# PowerShell скрипт для проверки статуса системы

Write-Host "🔍 Проверка статуса системы..." -ForegroundColor Cyan
Write-Host ""

try {
    # Проверяем API статистики
    $statsResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/import/doors/stats" -Method GET
    $statsData = $statsResponse.Content | ConvertFrom-Json
    
    Write-Host "=== СТАТУС СИСТЕМЫ ===" -ForegroundColor Green
    Write-Host "Режим: $($statsData.demo_mode)" -ForegroundColor Yellow
    Write-Host "Всего импортов: $($statsData.total_imports)" -ForegroundColor White
    Write-Host "Сообщение: $($statsData.message)" -ForegroundColor White
    Write-Host ""
    
    if ($statsData.demo_mode -eq $true) {
        Write-Host "⚠️  ВНИМАНИЕ: Это демо-версия!" -ForegroundColor Red
        Write-Host ""
        Write-Host "=== ТРЕБОВАНИЯ ДЛЯ РЕАЛЬНОЙ РАБОТЫ ===" -ForegroundColor Green
        $statsData.requirements | ForEach-Object {
            Write-Host "• $_" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "📋 Для работы с реальными данными выполните:" -ForegroundColor Yellow
        Write-Host "   1. npm install xlsx pg @types/pg" -ForegroundColor White
        Write-Host "   2. Настройте базу данных" -ForegroundColor White
        Write-Host "   3. Обновите API для реальной обработки" -ForegroundColor White
        Write-Host "   4. Протестируйте с вашими файлами" -ForegroundColor White
    } else {
        Write-Host "✅ Система готова к работе с реальными данными!" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Ошибка подключения к API" -ForegroundColor Red
    Write-Host "   Убедитесь, что сервер запущен на http://localhost:3000" -ForegroundColor Yellow
}
