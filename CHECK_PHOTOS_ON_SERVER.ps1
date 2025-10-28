# Скрипт для проверки фото на сервере
# Запустить на сервере: 130.193.40.35

Write-Host "=== ПРОВЕРКА ФОТО НА СЕРВЕРЕ ===" -ForegroundColor Green

# 1. Проверить контейнеры
Write-Host "`n1. Проверка контейнеров..." -ForegroundColor Yellow
docker ps | grep -E "(staging|app|postgres)"

# 2. Проверить таблицу PropertyPhoto
Write-Host "`n2. Проверка таблицы PropertyPhoto..." -ForegroundColor Yellow
docker exec domeo-staging-postgres psql -U postgres -d domeo -c "
SELECT 
  propertyName,
  propertyValue,
  photoType,
  LEFT(photoPath, 50) as photoPath,
  createdAt
FROM property_photo 
WHERE categoryId = 'cmg50xcgs001cv7mn0tdyk1wo'
ORDER BY createdAt DESC
LIMIT 20;
"

# 3. Проверить товары и их модели/артикулы
Write-Host "`n3. Проверка товаров и моделей..." -ForegroundColor Yellow
docker exec domeo-staging-postgres psql -U postgres -d domeo -c "
SELECT 
  sku,
  properties_data::json->>'Domeo_Название модели для Web' as model,
  properties_data::json->>'Артикул поставщика' as article
FROM products
WHERE catalog_category_id = 'cmg50xcgs001cv7mn0tdyk1wo'
LIMIT 10;
"

# 4. Проверить физические файлы
Write-Host "`n4. Проверка физических файлов..." -ForegroundColor Yellow
docker exec domeo-staging-app ls -1 public/uploads/products/cmg50xcgs001cv7mn0tdyk1wo/ | head -20

# 5. Проверить логи API за последнее время
Write-Host "`n5. Проверка логов API..." -ForegroundColor Yellow
docker logs domeo-staging-app --tail 100 | grep -E "(📸|photo|Фото)" | tail -30

Write-Host "`n=== ПРОВЕРКА ЗАВЕРШЕНА ===" -ForegroundColor Green

