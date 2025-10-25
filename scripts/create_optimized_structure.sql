-- ============================================
-- СОЗДАНИЕ ОПТИМИЗИРОВАННЫХ ТАБЛИЦ DOMEO
-- ============================================

-- Подключение к базе данных
\c domeo_production;

-- Создание расширений (если еще не созданы)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================
-- 1. ОПТИМИЗИРОВАННАЯ ТАБЛИЦА ТОВАРОВ
-- ============================================

-- Создаем новую оптимизированную таблицу товаров
CREATE TABLE IF NOT EXISTS products_optimized (
    id VARCHAR(50) PRIMARY KEY,
    catalog_category_id VARCHAR(50) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    brand VARCHAR(100),
    model VARCHAR(100),
    series VARCHAR(100),
    
    -- Ценообразование
    base_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    
    -- Склад
    stock_quantity INTEGER DEFAULT 0,
    min_order_qty INTEGER DEFAULT 1,
    
    -- Физические характеристики (нормализованные)
    weight_kg DECIMAL(8,3),
    width_mm INTEGER,
    height_mm INTEGER,
    depth_mm INTEGER,
    
    -- Статусы
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Дополнительные данные (только для сложных случаев)
    specifications JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. НОРМАЛИЗОВАННАЯ ТАБЛИЦА СВОЙСТВ ТОВАРОВ
-- ============================================

-- Создаем таблицу для нормализованных свойств товаров
CREATE TABLE IF NOT EXISTS product_property_values (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id VARCHAR(50) NOT NULL,
    property_name VARCHAR(100) NOT NULL,
    property_value TEXT NOT NULL,
    property_type VARCHAR(20) DEFAULT 'text', -- text, number, boolean, date
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (product_id) REFERENCES products_optimized(id) ON DELETE CASCADE,
    UNIQUE(product_id, property_name)
);

-- ============================================
-- 3. ОПТИМИЗИРОВАННАЯ ТАБЛИЦА КАТЕГОРИЙ
-- ============================================

-- Создаем оптимизированную таблицу категорий
CREATE TABLE IF NOT EXISTS catalog_categories_optimized (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(50),
    level INTEGER DEFAULT 0,
    path VARCHAR(500) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Кэшированные счетчики (обновляются триггерами)
    direct_products_count INTEGER DEFAULT 0,
    total_products_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (parent_id) REFERENCES catalog_categories_optimized(id) ON DELETE CASCADE
);

-- ============================================
-- 4. УНИВЕРСАЛЬНАЯ СИСТЕМА ДОКУМЕНТОВ
-- ============================================

-- Создаем универсальную таблицу документов
CREATE TABLE IF NOT EXISTS documents_unified (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- quote, invoice, order, supplier_order
    number VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Даты
    document_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Финансы
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'RUB',
    
    -- Связи между документами
    parent_document_id VARCHAR(50),
    
    -- Метаданные
    notes TEXT,
    terms TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (parent_document_id) REFERENCES documents_unified(id)
);

-- Создаем универсальную таблицу элементов документов
CREATE TABLE IF NOT EXISTS document_items_unified (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (document_id) REFERENCES documents_unified(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products_optimized(id)
);

-- ============================================
-- 5. КРИТИЧЕСКИЕ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Индексы для товаров
CREATE INDEX IF NOT EXISTS idx_products_optimized_category ON products_optimized(catalog_category_id);
CREATE INDEX IF NOT EXISTS idx_products_optimized_active ON products_optimized(is_active);
CREATE INDEX IF NOT EXISTS idx_products_optimized_sku ON products_optimized(sku);
CREATE INDEX IF NOT EXISTS idx_products_optimized_brand ON products_optimized(brand);
CREATE INDEX IF NOT EXISTS idx_products_optimized_model ON products_optimized(model);
CREATE INDEX IF NOT EXISTS idx_products_optimized_price ON products_optimized(base_price);

-- Составные индексы для калькулятора дверей
CREATE INDEX IF NOT EXISTS idx_products_doors_calc ON products_optimized(catalog_category_id, brand, model, width_mm, height_mm) 
WHERE is_active = true;

-- Индексы для свойств товаров
CREATE INDEX IF NOT EXISTS idx_product_property_values_product ON product_property_values(product_id);
CREATE INDEX IF NOT EXISTS idx_product_property_values_name ON product_property_values(property_name);
CREATE INDEX IF NOT EXISTS idx_product_property_values_value ON product_property_values(property_value);
CREATE INDEX IF NOT EXISTS idx_product_property_values_composite ON product_property_values(product_id, property_name, property_value);

-- Индексы для категорий
CREATE INDEX IF NOT EXISTS idx_catalog_categories_optimized_parent ON catalog_categories_optimized(parent_id);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_optimized_path ON catalog_categories_optimized(path);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_optimized_level ON catalog_categories_optimized(level);
CREATE INDEX IF NOT EXISTS idx_catalog_categories_optimized_active ON catalog_categories_optimized(is_active);

-- Индексы для документов
CREATE INDEX IF NOT EXISTS idx_documents_unified_client ON documents_unified(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_unified_type ON documents_unified(type);
CREATE INDEX IF NOT EXISTS idx_documents_unified_status ON documents_unified(status);
CREATE INDEX IF NOT EXISTS idx_documents_unified_date ON documents_unified(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_unified_number ON documents_unified(number);
CREATE INDEX IF NOT EXISTS idx_documents_unified_parent ON documents_unified(parent_document_id);

-- Индексы для элементов документов
CREATE INDEX IF NOT EXISTS idx_document_items_unified_document ON document_items_unified(document_id);
CREATE INDEX IF NOT EXISTS idx_document_items_unified_product ON document_items_unified(product_id);

-- ============================================
-- 6. МАТЕРИАЛИЗОВАННЫЕ ПРЕДСТАВЛЕНИЯ
-- ============================================

-- Создаем материализованное представление для быстрого поиска товаров
CREATE MATERIALIZED VIEW IF NOT EXISTS products_search_index AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.brand,
    p.model,
    p.series,
    p.base_price,
    p.width_mm,
    p.height_mm,
    p.is_active,
    cc.name as category_name,
    cc.path as category_path,
    -- Объединяем все свойства в один текстовый индекс
    string_agg(ppv.property_name || ':' || ppv.property_value, ' ') as properties_text
FROM products_optimized p
JOIN catalog_categories_optimized cc ON p.catalog_category_id = cc.id
LEFT JOIN product_property_values ppv ON p.id = ppv.product_id
WHERE p.is_active = true
GROUP BY p.id, p.sku, p.name, p.brand, p.model, p.series, p.base_price, 
         p.width_mm, p.height_mm, p.is_active, cc.name, cc.path;

-- Индекс для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_products_search_fts ON products_search_index 
USING gin(to_tsvector('russian', name || ' ' || brand || ' ' || model || ' ' || properties_text));

-- ============================================
-- 7. ФУНКЦИИ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ СЧЕТЧИКОВ
-- ============================================

-- Функция для обновления счетчиков товаров в категориях
CREATE OR REPLACE FUNCTION update_category_product_counts_optimized()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчики для всех родительских категорий
    WITH RECURSIVE category_hierarchy AS (
        SELECT id, parent_id, 0 as level
        FROM catalog_categories_optimized 
        WHERE id = COALESCE(NEW.catalog_category_id, OLD.catalog_category_id)
        
        UNION ALL
        
        SELECT c.id, c.parent_id, ch.level + 1
        FROM catalog_categories_optimized c
        JOIN category_hierarchy ch ON c.id = ch.parent_id
    )
    UPDATE catalog_categories_optimized 
    SET 
        direct_products_count = (
            SELECT COUNT(*) 
            FROM products_optimized 
            WHERE catalog_category_id = catalog_categories_optimized.id AND is_active = true
        ),
        total_products_count = (
            SELECT COUNT(*) 
            FROM products_optimized p
            JOIN category_hierarchy ch ON p.catalog_category_id = ch.id
            WHERE ch.id = catalog_categories_optimized.id AND p.is_active = true
        ),
        updated_at = NOW()
    WHERE id IN (SELECT id FROM category_hierarchy);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
-- ============================================

-- Триггеры для автоматического обновления счетчиков товаров
DROP TRIGGER IF EXISTS trigger_update_product_counts_insert_optimized ON products_optimized;
CREATE TRIGGER trigger_update_product_counts_insert_optimized
    AFTER INSERT ON products_optimized
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_counts_optimized();

DROP TRIGGER IF EXISTS trigger_update_product_counts_update_optimized ON products_optimized;
CREATE TRIGGER trigger_update_product_counts_update_optimized
    AFTER UPDATE ON products_optimized
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_counts_optimized();

DROP TRIGGER IF EXISTS trigger_update_product_counts_delete_optimized ON products_optimized;
CREATE TRIGGER trigger_update_product_counts_delete_optimized
    AFTER DELETE ON products_optimized
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_counts_optimized();

-- ============================================
-- 9. ФУНКЦИИ ДЛЯ ОБНОВЛЕНИЯ МАТЕРИАЛИЗОВАННЫХ ПРЕДСТАВЛЕНИЙ
-- ============================================

-- Функция для обновления материализованного представления
CREATE OR REPLACE FUNCTION refresh_products_search_index()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY products_search_index;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. ЗАВЕРШЕНИЕ СОЗДАНИЯ СТРУКТУРЫ
-- ============================================

-- Создаем представление для анализа производительности
CREATE OR REPLACE VIEW performance_analysis AS
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname IN ('public', 'domeo_optimized')
ORDER BY schemaname, tablename, attname;

-- Предоставляем права на новые таблицы
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO domeo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO domeo_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO domeo_user;

-- Завершение создания структуры
SELECT 'Оптимизированная структура базы данных создана успешно' as status;
SELECT 'Таблицы:' as info, COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%optimized%' OR table_name LIKE '%unified%';
SELECT 'Индексы:' as info, COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public';
SELECT 'Функции:' as info, COUNT(*) as count FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
