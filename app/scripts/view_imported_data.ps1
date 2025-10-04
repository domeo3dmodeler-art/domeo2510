# PowerShell скрипт для просмотра загруженной информации

Write-Host "🔍 Просмотр загруженной информации..." -ForegroundColor Cyan
Write-Host ""

try {
    # Получаем детальную информацию
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/import/doors/products" -Method GET
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Данные получены" -ForegroundColor Green
    Write-Host ""
    
    # Общая статистика
    Write-Host "📊 ОБЩАЯ СТАТИСТИКА:" -ForegroundColor Yellow
    Write-Host "   Всего товаров: $($data.total)" -ForegroundColor White
    Write-Host "   Общая стоимость: $($data.summary.total_value) ₽" -ForegroundColor Green
    Write-Host ""
    
    # Статистика по стилям
    Write-Host "🎨 ПО СТИЛЯМ:" -ForegroundColor Yellow
    $data.summary.by_style.PSObject.Properties | ForEach-Object {
        Write-Host "   $($_.Name): $($_.Value) товаров" -ForegroundColor White
    }
    Write-Host ""
    
    # Статистика по ценам
    Write-Host "💰 ПО ЦЕНАМ:" -ForegroundColor Yellow
    $data.summary.by_price_range.PSObject.Properties | ForEach-Object {
        Write-Host "   $($_.Name): $($_.Value) товаров" -ForegroundColor White
    }
    Write-Host ""
    
    # Детальная информация о товарах
    Write-Host "📦 ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О ТОВАРАХ:" -ForegroundColor Yellow
    Write-Host ""
    
    $data.products | ForEach-Object {
        Write-Host "🔹 $($_.supplier_sku)" -ForegroundColor Cyan
        Write-Host "   Модель: $($_.model)" -ForegroundColor White
        Write-Host "   Стиль: $($_.style)" -ForegroundColor White
        Write-Host "   Покрытие: $($_.finish)" -ForegroundColor White
        Write-Host "   Цвет: $($_.color)" -ForegroundColor White
        Write-Host "   Размер: $($_.width) x $($_.height) мм" -ForegroundColor White
        Write-Host "   Цена РРЦ: $($_.price_rrc) ₽" -ForegroundColor Green
        Write-Host "   Фото: $($_.photo_url)" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Экспорт в CSV
    Write-Host "💾 Экспорт в CSV..." -ForegroundColor Yellow
    $csvResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/import/doors/products?format=csv" -Method GET
    $csvResponse.Content | Out-File -FilePath "imported_products.csv" -Encoding UTF8
    Write-Host "✅ Данные экспортированы в файл: imported_products.csv" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Ошибка получения данных" -ForegroundColor Red
    Write-Host "   Убедитесь, что сервер запущен на http://localhost:3000" -ForegroundColor Yellow
}
