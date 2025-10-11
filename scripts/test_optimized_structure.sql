-- ============================================
-- ТЕСТИРОВАНИЕ ОПТИМИЗИРОВАННОЙ СТРУКТУРЫ
-- ============================================

-- Подключение к базе данных
\c domeo_production;

-- ============================================
-- 1. ТЕСТЫ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Создаем таблицу для записи результатов тестов
CREATE TABLE IF NOT EXISTS performance_test_results (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    records_processed INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Функция для измерения времени выполнения
CREATE OR REPLACE FUNCTION measure_execution_time(
    test_name TEXT,
    query_text TEXT
)
RETURNS INTEGER AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time_ms INTEGER;
    records_count INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    EXECUTE query_text INTO records_count;
    
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Записываем результат теста
    INSERT INTO performance_test_results (test_name, execution_time_ms, records_processed, success)
    VALUES (test_name, execution_time_ms, COALESCE(records_count, 0), true);
    
    RETURN execution_time_ms;
EXCEPTION
    WHEN OTHERS THEN
        -- Записываем ошибку
        INSERT INTO performance_test_results (test_name, execution_time_ms, success, error_message)
        VALUES (test_name, 0, false, SQLERRM);
        
        RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. ТЕСТ 1: ПОИСК ТОВАРОВ ПО КАТЕГОРИИ
-- ============================================

SELECT measure_execution_time(
    'Поиск товаров по категории (оптимизированная)',
    'SELECT COUNT(*) FROM products_optimized WHERE catalog_category_id = (SELECT id FROM catalog_categories_optimized LIMIT 1) AND is_active = true'
);

-- ============================================
-- 3. ТЕСТ 2: ПОИСК ПО СВОЙСТВАМ ТОВАРОВ
-- ============================================

SELECT measure_execution_time(
    'Поиск по свойствам товаров (нормализованная)',
    'SELECT COUNT(*) FROM products_optimized p JOIN product_property_values ppv ON p.id = ppv.product_id WHERE ppv.property_name = ''Domeo_Стиль Web'' AND ppv.property_value = ''Современный'''
);

-- ============================================
-- 4. ТЕСТ 3: КАЛЬКУЛЯТОР ДВЕРЕЙ (СЛОЖНЫЙ ЗАПРОС)
-- ============================================

SELECT measure_execution_time(
    'Калькулятор дверей (оптимизированный)',
    'SELECT COUNT(*) FROM products_optimized p 
     LEFT JOIN product_property_values ppv_material ON p.id = ppv_material.product_id AND ppv_material.property_name = ''Domeo_Стиль Web''
     LEFT JOIN product_property_values ppv_color ON p.id = ppv_color.product_id AND ppv_color.property_name = ''Domeo_Цвет''
     LEFT JOIN product_property_values ppv_width ON p.id = ppv_width.product_id AND ppv_width.property_name = ''Ширина/мм''
     LEFT JOIN product_property_values ppv_height ON p.id = ppv_height.product_id AND ppv_height.property_name = ''Высота/мм''
     WHERE p.is_active = true 
     AND p.catalog_category_id = (SELECT id FROM catalog_categories_optimized WHERE name LIKE ''%двер%'' LIMIT 1)
     AND ppv_material.property_value = ''Современный''
     AND ppv_width.property_value = ''800''
     AND ppv_height.property_value = ''2000'''
);

-- ============================================
-- 5. ТЕСТ 4: ПОДСЧЕТ ТОВАРОВ В КАТЕГОРИЯХ
-- ============================================

SELECT measure_execution_time(
    'Подсчет товаров в категориях (кэшированный)',
    'SELECT COUNT(*) FROM catalog_categories_optimized WHERE total_products_count > 0'
);

-- ============================================
-- 6. ТЕСТ 5: ПОЛНОТЕКСТОВЫЙ ПОИСК
-- ============================================

SELECT measure_execution_time(
    'Полнотекстовый поиск (материализованное представление)',
    'SELECT COUNT(*) FROM products_search_index WHERE to_tsvector(''russian'', name || '' '' || brand || '' '' || model || '' '' || properties_text) @@ to_tsquery(''russian'', ''двер*'')'
);

-- ============================================
-- 7. ТЕСТ 6: СОЗДАНИЕ ДОКУМЕНТА С ЭЛЕМЕНТАМИ
-- ============================================

-- Тест создания документа
DO $$
DECLARE
    test_document_id VARCHAR(50) := 'test_doc_' || extract(epoch from now())::text;
    test_client_id VARCHAR(50);
    test_product_id VARCHAR(50);
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time_ms INTEGER;
BEGIN
    -- Получаем тестовые данные
    SELECT id INTO test_client_id FROM clients LIMIT 1;
    SELECT id INTO test_product_id FROM products_optimized LIMIT 1;
    
    IF test_client_id IS NOT NULL AND test_product_id IS NOT NULL THEN
        start_time := clock_timestamp();
        
        -- Создаем документ
        INSERT INTO documents_unified (
            id, client_id, type, number, status, subtotal, total_amount
        ) VALUES (
            test_document_id, test_client_id, 'quote', 'TEST-001', 'draft', 1000.00, 1000.00
        );
        
        -- Создаем элемент документа
        INSERT INTO document_items_unified (
            document_id, product_id, quantity, unit_price, total_price
        ) VALUES (
            test_document_id, test_product_id, 1, 1000.00, 1000.00
        );
        
        end_time := clock_timestamp();
        execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
        
        -- Записываем результат
        INSERT INTO performance_test_results (test_name, execution_time_ms, records_processed, success)
        VALUES ('Создание документа с элементами', execution_time_ms, 2, true);
        
        -- Очищаем тестовые данные
        DELETE FROM document_items_unified WHERE document_id = test_document_id;
        DELETE FROM documents_unified WHERE id = test_document_id;
    ELSE
        INSERT INTO performance_test_results (test_name, execution_time_ms, success, error_message)
        VALUES ('Создание документа с элементами', 0, false, 'Недостаточно тестовых данных');
    END IF;
END $$;

-- ============================================
-- 8. ТЕСТ 7: АГРЕГАЦИЯ ДАННЫХ
-- ============================================

SELECT measure_execution_time(
    'Агрегация данных по категориям',
    'SELECT cc.name, COUNT(p.id) as products_count, AVG(p.base_price) as avg_price, MIN(p.base_price) as min_price, MAX(p.base_price) as max_price
     FROM catalog_categories_optimized cc
     LEFT JOIN products_optimized p ON cc.id = p.catalog_category_id
     WHERE cc.is_active = true
     GROUP BY cc.id, cc.name
     ORDER BY products_count DESC'
);

-- ============================================
-- 9. ТЕСТ 8: СЛОЖНЫЕ ФИЛЬТРЫ
-- ============================================

SELECT measure_execution_time(
    'Сложные фильтры по множественным свойствам',
    'SELECT COUNT(*) FROM products_optimized p
     WHERE p.is_active = true
     AND p.base_price BETWEEN 10000 AND 50000
     AND EXISTS (SELECT 1 FROM product_property_values ppv WHERE ppv.product_id = p.id AND ppv.property_name = ''Domeo_Стиль Web'')
     AND EXISTS (SELECT 1 FROM product_property_values ppv WHERE ppv.product_id = p.id AND ppv.property_name = ''Domeo_Цвет'')
     AND p.width_mm IS NOT NULL
     AND p.height_mm IS NOT NULL'
);

-- ============================================
-- 10. АНАЛИЗ РЕЗУЛЬТАТОВ ТЕСТОВ
-- ============================================

-- Создаем представление для анализа результатов
CREATE OR REPLACE VIEW test_results_analysis AS
SELECT 
    test_name,
    execution_time_ms,
    records_processed,
    success,
    CASE 
        WHEN execution_time_ms < 10 THEN 'Отлично (< 10ms)'
        WHEN execution_time_ms < 50 THEN 'Хорошо (< 50ms)'
        WHEN execution_time_ms < 100 THEN 'Удовлетворительно (< 100ms)'
        WHEN execution_time_ms < 500 THEN 'Медленно (< 500ms)'
        ELSE 'Очень медленно (> 500ms)'
    END as performance_rating,
    timestamp
FROM performance_test_results
ORDER BY execution_time_ms ASC;

-- Показываем результаты тестов
SELECT 'РЕЗУЛЬТАТЫ ТЕСТОВ ПРОИЗВОДИТЕЛЬНОСТИ:' as title;
SELECT '=====================================' as separator;

SELECT 
    test_name as "Тест",
    execution_time_ms as "Время (мс)",
    records_processed as "Записей",
    performance_rating as "Оценка",
    CASE WHEN success THEN 'Успех' ELSE 'Ошибка' END as "Статус"
FROM test_results_analysis
ORDER BY execution_time_ms;

-- Статистика по тестам
SELECT 'СТАТИСТИКА ТЕСТОВ:' as title;
SELECT '=================' as separator;

SELECT 
    COUNT(*) as "Всего тестов",
    COUNT(CASE WHEN success THEN 1 END) as "Успешных",
    COUNT(CASE WHEN NOT success THEN 1 END) as "Неудачных",
    AVG(execution_time_ms) as "Среднее время (мс)",
    MIN(execution_time_ms) as "Минимальное время (мс)",
    MAX(execution_time_ms) as "Максимальное время (мс)"
FROM performance_test_results;

-- ============================================
-- 11. ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ
-- ============================================

SELECT 'ПРОВЕРКА ЦЕЛОСТНОСТИ ДАННЫХ:' as title;
SELECT '=============================' as separator;

-- Проверяем количество записей
SELECT 'Количество записей в таблицах:' as check_type;

SELECT 'products_optimized' as table_name, COUNT(*) as count FROM products_optimized
UNION ALL
SELECT 'product_property_values' as table_name, COUNT(*) as count FROM product_property_values
UNION ALL
SELECT 'catalog_categories_optimized' as table_name, COUNT(*) as count FROM catalog_categories_optimized
UNION ALL
SELECT 'documents_unified' as table_name, COUNT(*) as count FROM documents_unified
UNION ALL
SELECT 'document_items_unified' as table_name, COUNT(*) as count FROM document_items_unified;

-- Проверяем индексы
SELECT 'Индексы в оптимизированных таблицах:' as check_type;

SELECT 
    schemaname as "Схема",
    tablename as "Таблица",
    indexname as "Индекс",
    indexdef as "Определение"
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (tablename LIKE '%optimized%' OR tablename LIKE '%unified%')
ORDER BY tablename, indexname;

-- Проверяем материализованные представления
SELECT 'Материализованные представления:' as check_type;

SELECT 
    schemaname as "Схема",
    matviewname as "Представление",
    definition as "Определение"
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;

-- ============================================
-- 12. РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ
-- ============================================

SELECT 'РЕКОМЕНДАЦИИ ПО ОПТИМИЗАЦИИ:' as title;
SELECT '=============================' as separator;

-- Анализируем медленные тесты
SELECT 
    'Медленные тесты (> 100ms):' as recommendation,
    test_name as "Тест",
    execution_time_ms as "Время (мс)",
    CASE 
        WHEN test_name LIKE '%поиск%' THEN 'Рассмотрите создание дополнительных индексов'
        WHEN test_name LIKE '%агрегация%' THEN 'Рассмотрите создание материализованных представлений'
        WHEN test_name LIKE '%фильтр%' THEN 'Оптимизируйте составные индексы'
        ELSE 'Требует дополнительного анализа'
    END as "Рекомендация"
FROM performance_test_results
WHERE execution_time_ms > 100
ORDER BY execution_time_ms DESC;

-- ============================================
-- 13. ЗАВЕРШЕНИЕ ТЕСТИРОВАНИЯ
-- ============================================

SELECT 'ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!' as status;
SELECT '========================' as separator;
SELECT 'Все тесты выполнены. Проверьте результаты выше.' as info;
SELECT 'При необходимости выполните дополнительную оптимизацию.' as recommendation;

-- Очищаем временные функции
DROP FUNCTION measure_execution_time(TEXT, TEXT);
