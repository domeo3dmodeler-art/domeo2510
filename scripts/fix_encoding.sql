-- Исправление кодировки русского языка в базе данных
-- Проблема: данные в БД хранятся в неправильной кодировке (например, "Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ" вместо "Современная")

-- 1. Создаем временную таблицу для исправления кодировки
CREATE TEMP TABLE encoding_fix AS 
SELECT 
  id,
  properties_data,
  CASE 
    WHEN properties_data LIKE '%Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ%' THEN 
      REPLACE(properties_data, 'Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ', 'Современная')
    ELSE properties_data
  END as fixed_properties_data
FROM Product 
WHERE properties_data LIKE '%Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ%';

-- 2. Обновляем данные в основной таблице
UPDATE Product 
SET properties_data = (
  SELECT fixed_properties_data 
  FROM encoding_fix 
  WHERE encoding_fix.id = Product.id
)
WHERE id IN (SELECT id FROM encoding_fix);

-- 3. Проверяем результат
SELECT 
  id,
  properties_data,
  CASE 
    WHEN properties_data LIKE '%Современная%' THEN '✅ Исправлено'
    WHEN properties_data LIKE '%Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ%' THEN '❌ Не исправлено'
    ELSE 'ℹ️ Не содержит проблемных данных'
  END as status
FROM Product 
WHERE properties_data LIKE '%Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ%' 
   OR properties_data LIKE '%Современная%'
LIMIT 10;
