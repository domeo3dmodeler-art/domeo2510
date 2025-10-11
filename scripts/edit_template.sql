-- Пример SQL запросов для редактирования шаблона

-- 1. Просмотр текущего шаблона
SELECT 
  id,
  name,
  description,
  required_fields,
  calculator_fields,
  export_fields,
  template_config,
  created_at,
  updated_at
FROM importTemplate 
WHERE catalog_category_id = 'cmg50xcgs001cv7mn0tdyk1wo';

-- 2. Обновление обязательных полей
UPDATE importTemplate 
SET 
  required_fields = '["SKU", "Name", "Price", "Model", "Size"]',
  updated_at = datetime('now')
WHERE id = 'cmg6u3kis0cg7mej2z6nnuezp';

-- 3. Обновление конфигурации шаблона
UPDATE importTemplate 
SET 
  template_config = '{"headers": ["SKU", "Name", "Price", "Model", "Size"], "requiredFields": ["SKU", "Name", "Price"]}',
  updated_at = datetime('now')
WHERE id = 'cmg6u3kis0cg7mej2z6nnuezp';

-- 4. Добавление нового поля в обязательные
UPDATE importTemplate 
SET 
  required_fields = json_insert(required_fields, '$[#]', 'Новое поле'),
  updated_at = datetime('now')
WHERE id = 'cmg6u3kis0cg7mej2z6nnuezp';
