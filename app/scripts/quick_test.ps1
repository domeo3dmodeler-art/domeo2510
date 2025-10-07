# scripts/quick_test.ps1
# PowerShell скрипт для быстрого тестирования

Write-Host "🧪 Быстрое тестирование функционала..." -ForegroundColor Green

# Функция для тестирования URL
function Test-Url {
    param(
        [string]$Url,
        [string]$Name
    )
    
    Write-Host "Тестируем $Name... " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 204) {
            Write-Host "✅ OK" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ FAIL (HTTP $($response.StatusCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ FAIL" -ForegroundColor Red
        return $false
    }
}

# Проверяем, что сервер запущен
Write-Host "🔍 Проверяем, что сервер запущен..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($healthResponse.StatusCode -eq 204) {
        Write-Host "✅ Сервер запущен" -ForegroundColor Green
    } else {
        Write-Host "❌ Сервер не отвечает правильно" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Сервер не запущен!" -ForegroundColor Red
    Write-Host "Запустите сервер: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Тестируем основные страницы
Write-Host "📱 Тестируем основные страницы:" -ForegroundColor Cyan
Test-Url "http://localhost:3000/" "Главная страница"
Test-Url "http://localhost:3000/admin" "Админка"
Test-Url "http://localhost:3000/admin/doors" "Админка Doors"
Test-Url "http://localhost:3000/admin/import" "Импорт прайсов"
Test-Url "http://localhost:3000/quotes" "Управление КП"
Test-Url "http://localhost:3000/doors" "Каталог дверей"

Write-Host ""
Write-Host "🔌 Тестируем API endpoints:" -ForegroundColor Cyan
Test-Url "http://localhost:3000/api/health" "Health API"
Test-Url "http://localhost:3000/api/admin/categories" "Categories API"

Write-Host ""
Write-Host "📋 Рекомендации для тестирования UI/UX:" -ForegroundColor Yellow
Write-Host "1. Откройте http://localhost:3000 в браузере" -ForegroundColor White
Write-Host "2. Протестируйте навигацию между разделами" -ForegroundColor White
Write-Host "3. Проверьте формы на валидацию" -ForegroundColor White
Write-Host "4. Протестируйте на мобильном устройстве" -ForegroundColor White
Write-Host "5. Проверьте все модальные окна" -ForegroundColor White
Write-Host ""
Write-Host "📖 Подробное руководство: docs/testing_guide.md" -ForegroundColor Cyan
