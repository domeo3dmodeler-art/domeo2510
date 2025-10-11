-- ============================================
-- МИГРАЦИЯ ДАННЫХ В ОПТИМИЗИРОВАННУЮ СТРУКТУРУ
-- ============================================

-- Подключение к базе данных
\c domeo_production;

-- ============================================
-- 1. МИГРАЦИЯ КАТЕГОРИЙ КАТАЛОГА
-- ============================================

-- Мигрируем категории из старой таблицы в новую
INSERT INTO catalog_categories_optimized (
    id, name, parent_id, level, path, sort_order, is_active, 
    direct_products_count, total_products_count, created_at, updated_at
)
SELECT 
    id,
    name,
    parent_id,
    level,
    path,
    sort_order,
    is_active,
    products_count as direct_products_count, -- Временно используем старый счетчик
    products_count as total_products_count,  -- Временно используем старый счетчик
    created_at,
    updated_at
FROM catalog_categories
WHERE NOT EXISTS (
    SELECT 1 FROM catalog_categories_optimized 
    WHERE catalog_categories_optimized.id = catalog_categories.id
);

-- Обновляем счетчики товаров в категориях
UPDATE catalog_categories_optimized 
SET 
    direct_products_count = (
        SELECT COUNT(*) 
        FROM products 
        WHERE catalog_category_id = catalog_categories_optimized.id AND is_active = true
    ),
    total_products_count = (
        SELECT COUNT(*) 
        FROM products p
        JOIN catalog_categories_optimized cc ON p.catalog_category_id = cc.id
        WHERE cc.id = catalog_categories_optimized.id AND p.is_active = true
    );

-- ============================================
-- 2. МИГРАЦИЯ ТОВАРОВ С НОРМАЛИЗАЦИЕЙ СВОЙСТВ
-- ============================================

-- Мигрируем товары из старой таблицы в новую
INSERT INTO products_optimized (
    id, catalog_category_id, sku, name, description, brand, model, series,
    base_price, currency, stock_quantity, min_order_qty,
    weight_kg, width_mm, height_mm, depth_mm,
    specifications, tags, is_active, is_featured, created_at, updated_at
)
SELECT 
    p.id,
    p.catalog_category_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.model,
    p.series,
    p.base_price,
    p.currency,
    p.stock_quantity,
    p.min_order_qty,
    -- Извлекаем физические характеристики из JSON
    CASE 
        WHEN p.properties_data::jsonb ? 'weight' THEN (p.properties_data::jsonb->>'weight')::DECIMAL(8,3)
        ELSE NULL 
    END as weight_kg,
    CASE 
        WHEN p.properties_data::jsonb ? 'width' THEN (p.properties_data::jsonb->>'width')::INTEGER
        WHEN p.properties_data::jsonb ? 'Ширина/мм' THEN (p.properties_data::jsonb->>'Ширина/мм')::INTEGER
        ELSE NULL 
    END as width_mm,
    CASE 
        WHEN p.properties_data::jsonb ? 'height' THEN (p.properties_data::jsonb->>'height')::INTEGER
        WHEN p.properties_data::jsonb ? 'Высота/мм' THEN (p.properties_data::jsonb->>'Высота/мм')::INTEGER
        ELSE NULL 
    END as height_mm,
    CASE 
        WHEN p.properties_data::jsonb ? 'depth' THEN (p.properties_data::jsonb->>'depth')::INTEGER
        WHEN p.properties_data::jsonb ? 'Глубина/мм' THEN (p.properties_data::jsonb->>'Глубина/мм')::INTEGER
        ELSE NULL 
    END as depth_mm,
    -- Сохраняем сложные спецификации в JSON
    p.specifications,
    p.tags,
    p.is_active,
    p.is_featured,
    p.created_at,
    p.updated_at
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM products_optimized 
    WHERE products_optimized.id = p.id
);

-- ============================================
-- 3. МИГРАЦИЯ СВОЙСТВ ТОВАРОВ В НОРМАЛИЗОВАННУЮ ТАБЛИЦУ
-- ============================================

-- Функция для извлечения свойств из JSON и вставки в нормализованную таблицу
CREATE OR REPLACE FUNCTION migrate_product_properties()
RETURNS INTEGER AS $$
DECLARE
    product_record RECORD;
    property_key TEXT;
    property_value TEXT;
    properties_count INTEGER := 0;
BEGIN
    -- Проходим по всем товарам
    FOR product_record IN 
        SELECT id, properties_data 
        FROM products 
        WHERE properties_data IS NOT NULL 
        AND properties_data != '{}'
        AND properties_data != ''
    LOOP
        -- Извлекаем каждое свойство из JSON
        FOR property_key IN 
            SELECT jsonb_object_keys(product_record.properties_data::jsonb)
        LOOP
            -- Получаем значение свойства
            property_value := product_record.properties_data::jsonb->>property_key;
            
            -- Пропускаем пустые значения
            IF property_value IS NOT NULL AND property_value != '' THEN
                -- Определяем тип свойства
                DECLARE
                    property_type TEXT := 'text';
                BEGIN
                    -- Пытаемся определить тип по значению
                    IF property_value ~ '^[0-9]+$' THEN
                        property_type := 'number';
                    ELSIF property_value ~ '^(true|false)$' THEN
                        property_type := 'boolean';
                    ELSIF property_value ~ '^\d{4}-\d{2}-\d{2}' THEN
                        property_type := 'date';
                    END IF;
                END;
                
                -- Вставляем свойство в нормализованную таблицу
                INSERT INTO product_property_values (
                    product_id, property_name, property_value, property_type
                ) VALUES (
                    product_record.id,
                    property_key,
                    property_value,
                    property_type
                ) ON CONFLICT (product_id, property_name) DO UPDATE SET
                    property_value = EXCLUDED.property_value,
                    property_type = EXCLUDED.property_type;
                
                properties_count := properties_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN properties_count;
END;
$$ LANGUAGE plpgsql;

-- Выполняем миграцию свойств
SELECT migrate_product_properties() as migrated_properties_count;

-- Удаляем временную функцию
DROP FUNCTION migrate_product_properties();

-- ============================================
-- 4. МИГРАЦИЯ ДОКУМЕНТОВ В УНИВЕРСАЛЬНУЮ СИСТЕМУ
-- ============================================

-- Мигрируем коммерческие предложения (quotes)
INSERT INTO documents_unified (
    id, client_id, type, number, status, document_date, valid_until,
    subtotal, tax_amount, total_amount, currency, notes, terms, created_by, created_at, updated_at
)
SELECT 
    id,
    client_id,
    'quote' as type,
    number,
    status,
    created_at as document_date,
    valid_until,
    subtotal,
    tax_amount,
    total_amount,
    currency,
    notes,
    terms,
    created_by,
    created_at,
    updated_at
FROM quotes
WHERE NOT EXISTS (
    SELECT 1 FROM documents_unified 
    WHERE documents_unified.id = quotes.id
);

-- Мигрируем элементы коммерческих предложений
INSERT INTO document_items_unified (
    id, document_id, product_id, quantity, unit_price, total_price, notes
)
SELECT 
    id,
    quote_id as document_id,
    product_id,
    quantity,
    unit_price,
    total_price,
    notes
FROM quote_items
WHERE NOT EXISTS (
    SELECT 1 FROM document_items_unified 
    WHERE document_items_unified.id = quote_items.id
);

-- Мигрируем заказы (orders)
INSERT INTO documents_unified (
    id, client_id, type, number, status, document_date, delivery_date,
    subtotal, tax_amount, total_amount, currency, notes, created_by, created_at, updated_at
)
SELECT 
    id,
    client_id,
    'order' as type,
    number,
    status,
    order_date as document_date,
    delivery_date,
    subtotal,
    tax_amount,
    total_amount,
    currency,
    notes,
    created_by,
    created_at,
    updated_at
FROM orders
WHERE NOT EXISTS (
    SELECT 1 FROM documents_unified 
    WHERE documents_unified.id = orders.id
);

-- Мигрируем элементы заказов
INSERT INTO document_items_unified (
    id, document_id, product_id, quantity, unit_price, total_price, notes
)
SELECT 
    id,
    order_id as document_id,
    product_id,
    quantity,
    unit_price,
    total_price,
    notes
FROM order_items
WHERE NOT EXISTS (
    SELECT 1 FROM document_items_unified 
    WHERE document_items_unified.id = order_items.id
);

-- Мигрируем счета (invoices)
INSERT INTO documents_unified (
    id, client_id, type, number, status, document_date, due_date,
    subtotal, tax_amount, total_amount, currency, notes, created_by, created_at, updated_at
)
SELECT 
    id,
    client_id,
    'invoice' as type,
    number,
    status,
    invoice_date as document_date,
    due_date,
    subtotal,
    tax_amount,
    total_amount,
    currency,
    notes,
    created_by,
    created_at,
    updated_at
FROM invoices
WHERE NOT EXISTS (
    SELECT 1 FROM documents_unified 
    WHERE documents_unified.id = invoices.id
);

-- Мигрируем элементы счетов
INSERT INTO document_items_unified (
    id, document_id, product_id, quantity, unit_price, total_price, notes
)
SELECT 
    id,
    invoice_id as document_id,
    product_id,
    quantity,
    unit_price,
    total_price,
    notes
FROM invoice_items
WHERE NOT EXISTS (
    SELECT 1 FROM document_items_unified 
    WHERE document_items_unified.id = invoice_items.id
);

-- ============================================
-- 5. ОБНОВЛЕНИЕ МАТЕРИАЛИЗОВАННЫХ ПРЕДСТАВЛЕНИЙ
-- ============================================

-- Обновляем материализованное представление для поиска
SELECT refresh_products_search_index();

-- ============================================
-- 6. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
-- ============================================

-- Проверяем количество мигрированных записей
SELECT 'Миграция завершена. Статистика:' as status;

SELECT 'Категории каталога:' as table_name, 
       (SELECT COUNT(*) FROM catalog_categories_optimized) as optimized_count,
       (SELECT COUNT(*) FROM catalog_categories) as original_count;

SELECT 'Товары:' as table_name,
       (SELECT COUNT(*) FROM products_optimized) as optimized_count,
       (SELECT COUNT(*) FROM products) as original_count;

SELECT 'Свойства товаров:' as table_name,
       (SELECT COUNT(*) FROM product_property_values) as normalized_count,
       (SELECT COUNT(*) FROM products WHERE properties_data IS NOT NULL AND properties_data != '{}') as products_with_properties;

SELECT 'Документы:' as table_name,
       (SELECT COUNT(*) FROM documents_unified) as unified_count,
       (SELECT COUNT(*) FROM quotes) + (SELECT COUNT(*) FROM orders) + (SELECT COUNT(*) FROM invoices) as original_count;

SELECT 'Элементы документов:' as table_name,
       (SELECT COUNT(*) FROM document_items_unified) as unified_count,
       (SELECT COUNT(*) FROM quote_items) + (SELECT COUNT(*) FROM order_items) + (SELECT COUNT(*) FROM invoice_items) as original_count;

-- Проверяем целостность связей
SELECT 'Проверка целостности связей:' as check_type;

-- Проверяем товары без категорий
SELECT 'Товары без категорий:' as issue, COUNT(*) as count
FROM products_optimized p
LEFT JOIN catalog_categories_optimized cc ON p.catalog_category_id = cc.id
WHERE cc.id IS NULL;

-- Проверяем свойства без товаров
SELECT 'Свойства без товаров:' as issue, COUNT(*) as count
FROM product_property_values ppv
LEFT JOIN products_optimized p ON ppv.product_id = p.id
WHERE p.id IS NULL;

-- Проверяем элементы документов без документов
SELECT 'Элементы документов без документов:' as issue, COUNT(*) as count
FROM document_items_unified diu
LEFT JOIN documents_unified du ON diu.document_id = du.id
WHERE du.id IS NULL;

-- Проверяем элементы документов без товаров
SELECT 'Элементы документов без товаров:' as issue, COUNT(*) as count
FROM document_items_unified diu
LEFT JOIN products_optimized p ON diu.product_id = p.id
WHERE p.id IS NULL;

-- ============================================
-- 7. СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
-- ============================================

-- Создаем представления для обратной совместимости со старым API
CREATE OR REPLACE VIEW products_compatibility AS
SELECT 
    p.id,
    p.catalog_category_id,
    p.sku,
    p.name,
    p.description,
    p.brand,
    p.model,
    p.series,
    p.base_price,
    p.currency,
    p.stock_quantity,
    p.min_order_qty,
    p.weight_kg as weight,
    p.width_mm as width,
    p.height_mm as height,
    p.depth_mm as depth,
    p.specifications,
    p.tags,
    p.is_active,
    p.is_featured,
    p.created_at,
    p.updated_at,
    -- Создаем JSON с основными свойствами для обратной совместимости
    (
        SELECT jsonb_object_agg(property_name, property_value)
        FROM product_property_values ppv
        WHERE ppv.product_id = p.id
    ) as properties_data
FROM products_optimized p;

-- Создаем представление для категорий с обратной совместимостью
CREATE OR REPLACE VIEW catalog_categories_compatibility AS
SELECT 
    cc.id,
    cc.name,
    cc.parent_id,
    cc.level,
    cc.path,
    cc.sort_order,
    cc.is_active,
    cc.direct_products_count as products_count,
    cc.created_at,
    cc.updated_at
FROM catalog_categories_optimized cc;

-- Предоставляем права на представления
GRANT SELECT ON products_compatibility TO domeo_user;
GRANT SELECT ON catalog_categories_compatibility TO domeo_user;

-- ============================================
-- 8. ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================

SELECT 'Миграция данных в оптимизированную структуру завершена успешно!' as status;
SELECT 'Новые таблицы готовы к использованию' as info;
SELECT 'Старые таблицы сохранены для безопасности' as note;
SELECT 'Используйте представления для обратной совместимости' as recommendation;
