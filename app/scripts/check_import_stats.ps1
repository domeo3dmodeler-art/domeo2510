# PowerShell скрипт для проверки статистики импорта прайса

Write-Host "🔍 Проверка статистики импорта прайса..." -ForegroundColor Cyan
Write-Host ""

try {
    # Получаем статистику
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/import/doors/stats" -Method GET
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ API доступен" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📊 СТАТИСТИКА ИМПОРТА:" -ForegroundColor Yellow
    Write-Host "   Общее количество импортов: $($data.total_imports)" -ForegroundColor White
    Write-Host "   Последний файл: $($data.last_import.filename)" -ForegroundColor White
    Write-Host "   Строк загружено: $($data.last_import.rows_imported)" -ForegroundColor Green
    Write-Host "   Всего строк: $($data.last_import.rows_total)" -ForegroundColor White
    Write-Host "   Ошибок: $($data.last_import.errors)" -ForegroundColor Red
    Write-Host ""
    
    if ($data.last_import.errors -eq 0) {
        Write-Host "✅ Импорт прошел успешно!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Есть ошибки в импорте" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "📦 ЗАГРУЖЕННЫЕ ТОВАРЫ:" -ForegroundColor Yellow
    foreach ($product in $data.last_import.products) {
        Write-Host "   • $($product.supplier_sku) - $($product.model) ($($product.style)) - $($product.price_rrc) ₽" -ForegroundColor White
    }
    
} catch {
    Write-Host "❌ Ошибка подключения к API" -ForegroundColor Red
    Write-Host "   Убедитесь, что сервер запущен на http://localhost:3000" -ForegroundColor Yellow
}
