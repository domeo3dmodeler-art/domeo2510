-- ============================================
-- ОПТИМИЗИРОВАННАЯ СХЕМА БАЗЫ ДАННЫХ DOMEO
-- ============================================

-- 1. НОРМАЛИЗОВАННАЯ ТАБЛИЦА ТОВАРОВ
CREATE TABLE products (
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
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Связи
    FOREIGN KEY (catalog_category_id) REFERENCES catalog_categories(id) ON DELETE CASCADE
);

-- 2. НОРМАЛИЗОВАННАЯ ТАБЛИЦА СВОЙСТВ ТОВАРОВ
CREATE TABLE product_properties (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    property_name VARCHAR(100) NOT NULL,
    property_value TEXT NOT NULL,
    property_type VARCHAR(20) DEFAULT 'text', -- text, number, boolean, date
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, property_name)
);

-- 3. ОПТИМИЗИРОВАННАЯ ТАБЛИЦА КАТЕГОРИЙ
CREATE TABLE catalog_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(50),
    level INTEGER DEFAULT 0,
    path VARCHAR(500) NOT NULL, -- Полный путь категории
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Кэшированные счетчики (обновляются триггерами)
    direct_products_count INTEGER DEFAULT 0,
    total_products_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (parent_id) REFERENCES catalog_categories(id) ON DELETE CASCADE
);

-- 4. УНИВЕРСАЛЬНАЯ СИСТЕМА ДОКУМЕНТОВ
CREATE TABLE documents (
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
    
    -- Связи
    parent_document_id VARCHAR(50), -- Связь между документами
    
    -- Метаданные
    notes TEXT,
    terms TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_document_id) REFERENCES documents(id)
);

-- 5. УНИВЕРСАЛЬНАЯ ТАБЛИЦА ЭЛЕМЕНТОВ ДОКУМЕНТОВ
CREATE TABLE document_items (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================
-- КРИТИЧЕСКИЕ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Индексы для товаров
CREATE INDEX idx_products_category ON products(catalog_category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_model ON products(model);
CREATE INDEX idx_products_price ON products(base_price);

-- Составные индексы для калькулятора дверей
CREATE INDEX idx_products_doors_calc ON products(catalog_category_id, brand, model, width_mm, height_mm) 
WHERE is_active = true;

-- Индексы для свойств товаров
CREATE INDEX idx_product_properties_product ON product_properties(product_id);
CREATE INDEX idx_product_properties_name ON product_properties(property_name);
CREATE INDEX idx_product_properties_value ON product_properties(property_value);
CREATE INDEX idx_product_properties_composite ON product_properties(product_id, property_name, property_value);

-- Индексы для категорий
CREATE INDEX idx_categories_parent ON catalog_categories(parent_id);
CREATE INDEX idx_categories_path ON catalog_categories(path);
CREATE INDEX idx_categories_level ON catalog_categories(level);
CREATE INDEX idx_categories_active ON catalog_categories(is_active);

-- Индексы для документов
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_date ON documents(document_date);
CREATE INDEX idx_documents_number ON documents(number);

-- Индексы для элементов документов
CREATE INDEX idx_document_items_document ON document_items(document_id);
CREATE INDEX idx_document_items_product ON document_items(product_id);

-- ============================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ СЧЕТЧИКОВ
-- ============================================

-- Функция для обновления счетчиков товаров в категориях
CREATE OR REPLACE FUNCTION update_category_product_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчики для всех родительских категорий
    WITH RECURSIVE category_hierarchy AS (
        SELECT id, parent_id, 0 as level
        FROM catalog_categories 
        WHERE id = COALESCE(NEW.catalog_category_id, OLD.catalog_category_id)
        
        UNION ALL
        
        SELECT c.id, c.parent_id, ch.level + 1
        FROM catalog_categories c
        JOIN category_hierarchy ch ON c.id = ch.parent_id
    )
    UPDATE catalog_categories 
    SET 
        direct_products_count = (
            SELECT COUNT(*) 
            FROM products 
            WHERE catalog_category_id = catalog_categories.id AND is_active = true
        ),
        total_products_count = (
            SELECT COUNT(*) 
            FROM products p
            JOIN category_hierarchy ch ON p.catalog_category_id = ch.id
            WHERE ch.id = catalog_categories.id AND p.is_active = true
        ),
        updated_at = NOW()
    WHERE id IN (SELECT id FROM category_hierarchy);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления счетчиков
CREATE TRIGGER trigger_update_product_counts_insert
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_counts();

CREATE TRIGGER trigger_update_product_counts_update
    AFTER UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_counts();

CREATE TRIGGER trigger_update_product_counts_delete
    AFTER DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_category_product_counts();

-- ============================================
-- ПАРТИЦИОНИРОВАНИЕ ДЛЯ МАСШТАБИРУЕМОСТИ
-- ============================================

-- Партиционирование товаров по категориям (для больших объемов)
-- CREATE TABLE products_partitioned (
--     LIKE products INCLUDING ALL
-- ) PARTITION BY HASH (catalog_category_id);

-- Создание партиций для основных категорий
-- CREATE TABLE products_doors PARTITION OF products_partitioned
--     FOR VALUES WITH (MODULUS 4, REMAINDER 0);
-- CREATE TABLE products_windows PARTITION OF products_partitioned
--     FOR VALUES WITH (MODULUS 4, REMAINDER 1);

-- ============================================
-- МАТЕРИАЛИЗОВАННЫЕ ПРЕДСТАВЛЕНИЯ ДЛЯ СЛОЖНЫХ ЗАПРОСОВ
-- ============================================

-- Материализованное представление для быстрого поиска товаров
CREATE MATERIALIZED VIEW products_search_index AS
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
    string_agg(pp.property_name || ':' || pp.property_value, ' ') as properties_text
FROM products p
JOIN catalog_categories cc ON p.catalog_category_id = cc.id
LEFT JOIN product_properties pp ON p.id = pp.product_id
WHERE p.is_active = true
GROUP BY p.id, p.sku, p.name, p.brand, p.model, p.series, p.base_price, 
         p.width_mm, p.height_mm, p.is_active, cc.name, cc.path;

-- Индекс для полнотекстового поиска
CREATE INDEX idx_products_search_fts ON products_search_index 
USING gin(to_tsvector('russian', name || ' ' || brand || ' ' || model || ' ' || properties_text));

-- Функция для обновления материализованного представления
CREATE OR REPLACE FUNCTION refresh_products_search_index()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY products_search_index;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- НАСТРОЙКИ ПРОИЗВОДИТЕЛЬНОСТИ POSTGRESQL
-- ============================================

-- Рекомендуемые настройки для PostgreSQL
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- random_page_cost = 1.1
-- effective_io_concurrency = 200
