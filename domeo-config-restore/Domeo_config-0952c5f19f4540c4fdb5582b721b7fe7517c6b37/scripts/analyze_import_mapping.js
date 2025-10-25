const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeImportMapping() {
    console.log('🔍 АНАЛИЗ СИСТЕМЫ МАППИНГА СВОЙСТВ ТОВАРОВ ПРИ ИМПОРТЕ');
    console.log('========================================================');
    console.log('');

    try {
        // 1. Анализ шаблонов импорта
        console.log('📋 ШАБЛОНЫ ИМПОРТА:');
        console.log('-------------------');
        
        const importTemplates = await prisma.importTemplate.findMany({
            include: {
                catalog_category: true,
                _count: {
                    select: {
                        import_history: true
                    }
                }
            }
        });

        console.log(`Всего шаблонов импорта: ${importTemplates.length}`);
        console.log('');

        for (const template of importTemplates) {
            console.log(`📄 Шаблон: "${template.name}" (ID: ${template.id})`);
            console.log(`   Категория: ${template.catalog_category.name}`);
            console.log(`   Описание: ${template.description || 'Нет'}`);
            console.log(`   Активный: ${template.is_active ? 'Да' : 'Нет'}`);
            console.log(`   Импортов: ${template._count.import_history}`);
            console.log('');

            // Анализируем поля шаблона
            try {
                const requiredFields = template.required_fields ? JSON.parse(template.required_fields) : [];
                const calculatorFields = template.calculator_fields ? JSON.parse(template.calculator_fields) : [];
                const exportFields = template.export_fields ? JSON.parse(template.export_fields) : [];
                const fieldMappings = template.field_mappings ? JSON.parse(template.field_mappings) : null;
                const templateConfig = template.template_config ? JSON.parse(template.template_config) : null;

                console.log(`   📝 Обязательные поля (${requiredFields.length}):`);
                requiredFields.forEach((field, index) => {
                    console.log(`      ${index + 1}. ${field.displayName || field.fieldName || field} (${field.dataType || 'text'})`);
                });

                console.log(`   🧮 Поля для калькулятора (${calculatorFields.length}):`);
                calculatorFields.forEach((field, index) => {
                    console.log(`      ${index + 1}. ${field.displayName || field.fieldName || field} (${field.dataType || 'text'})`);
                });

                console.log(`   📤 Поля для экспорта (${exportFields.length}):`);
                exportFields.forEach((field, index) => {
                    console.log(`      ${index + 1}. ${field.displayName || field.fieldName || field} (${field.dataType || 'text'})`);
                });

                if (fieldMappings) {
                    console.log(`   🔗 Маппинг полей:`);
                    Object.entries(fieldMappings).forEach(([key, value]) => {
                        console.log(`      ${key} → ${value}`);
                    });
                }

                if (templateConfig) {
                    console.log(`   ⚙️ Конфигурация шаблона:`);
                    console.log(`      ${JSON.stringify(templateConfig, null, 6)}`);
                }

            } catch (error) {
                console.log(`   ❌ Ошибка парсинга JSON полей: ${error.message}`);
            }

            console.log('');
        }

        // 2. Анализ свойств товаров и их назначений
        console.log('🏷️ СВОЙСТВА ТОВАРОВ И НАЗНАЧЕНИЯ:');
        console.log('-----------------------------------');
        
        const propertyAssignments = await prisma.categoryPropertyAssignment.findMany({
            include: {
                product_property: true,
                catalog_category: true
            }
        });

        console.log(`Всего назначений свойств: ${propertyAssignments.length}`);
        console.log('');

        // Группируем по категориям
        const assignmentsByCategory = {};
        propertyAssignments.forEach(assignment => {
            const categoryName = assignment.catalog_category.name;
            if (!assignmentsByCategory[categoryName]) {
                assignmentsByCategory[categoryName] = [];
            }
            assignmentsByCategory[categoryName].push(assignment);
        });

        Object.entries(assignmentsByCategory).forEach(([categoryName, assignments]) => {
            console.log(`📂 ${categoryName}:`);
            assignments.forEach(assignment => {
                console.log(`   🏷️ ${assignment.product_property.name} (${assignment.product_property.type})`);
                console.log(`      Обязательное: ${assignment.is_required ? 'Да' : 'Нет'}`);
                console.log(`      Для калькулятора: ${assignment.is_for_calculator ? 'Да' : 'Нет'}`);
                console.log(`      Для экспорта: ${assignment.is_for_export ? 'Да' : 'Нет'}`);
            });
            console.log('');
        });

        // 3. Анализ товаров с свойствами
        console.log('🛍️ ТОВАРЫ СО СВОЙСТВАМИ:');
        console.log('-------------------------');
        
        const productsWithProperties = await prisma.product.findMany({
            where: {
                properties_data: {
                    not: '{}'
                }
            },
            select: {
                id: true,
                name: true,
                sku: true,
                properties_data: true,
                catalog_category: {
                    select: {
                        name: true
                    }
                }
            },
            take: 5
        });

        console.log(`Товаров со свойствами: ${productsWithProperties.length} (показываем первые 5)`);
        console.log('');

        productsWithProperties.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} (SKU: ${product.sku})`);
            console.log(`   Категория: ${product.catalog_category.name}`);
            console.log(`   Свойства:`);
            
            try {
                const properties = JSON.parse(product.properties_data);
                Object.entries(properties).forEach(([key, value]) => {
                    console.log(`      ${key}: ${value}`);
                });
            } catch (error) {
                console.log(`      ❌ Ошибка парсинга: ${error.message}`);
            }
            console.log('');
        });

        // 4. Анализ истории импорта
        console.log('📊 ИСТОРИЯ ИМПОРТА:');
        console.log('------------------');
        
        const importHistory = await prisma.importHistory.findMany({
            include: {
                template: {
                    include: {
                        catalog_category: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 10
        });

        console.log(`Последние импорты (показываем 10):`);
        console.log('');

        importHistory.forEach((history, index) => {
            console.log(`${index + 1}. ${history.filename}`);
            console.log(`   Дата: ${history.created_at.toLocaleString()}`);
            console.log(`   Статус: ${history.status}`);
            console.log(`   Импортировано: ${history.imported_count}`);
            console.log(`   Ошибок: ${history.error_count}`);
            if (history.template) {
                console.log(`   Шаблон: ${history.template.name} (${history.template.catalog_category.name})`);
            }
            console.log('');
        });

        // 5. Анализ маппинга полей
        console.log('🔗 АНАЛИЗ МАППИНГА ПОЛЕЙ:');
        console.log('-------------------------');
        
        console.log('Текущая система маппинга:');
        console.log('1. Заголовки Excel файла → Поля шаблона');
        console.log('2. Поля шаблона → Свойства товаров (JSON)');
        console.log('3. Свойства товаров → База данных');
        console.log('');

        console.log('Проблемы текущей системы:');
        console.log('❌ Свойства хранятся в JSON поле (неэффективно)');
        console.log('❌ Нет индексов для поиска по свойствам');
        console.log('❌ Сложные запросы для калькулятора');
        console.log('❌ Нет нормализации свойств');
        console.log('');

        console.log('Преимущества оптимизированной системы:');
        console.log('✅ Нормализованные свойства в отдельных таблицах');
        console.log('✅ Индексы для быстрого поиска');
        console.log('✅ Простые запросы для калькулятора');
        console.log('✅ Автоматическое обновление счетчиков');
        console.log('');

    } catch (error) {
        console.error('❌ Ошибка при анализе маппинга:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем анализ
analyzeImportMapping();
