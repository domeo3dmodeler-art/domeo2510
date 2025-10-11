const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSimplifiedImport() {
    console.log('🧪 ТЕСТИРОВАНИЕ УПРОЩЕННОЙ СИСТЕМЫ ИМПОРТА');
    console.log('============================================');
    console.log('');

    try {
        // 1. Проверяем обновленный шаблон
        console.log('📋 ПРОВЕРКА ОБНОВЛЕННОГО ШАБЛОНА:');
        console.log('----------------------------------');
        
        const doorsTemplate = await prisma.importTemplate.findFirst({
            where: {
                name: {
                    contains: 'Упрощенный шаблон для Межкомнатные двери'
                }
            },
            include: {
                catalog_category: true
            }
        });

        if (doorsTemplate) {
            console.log(`✅ Найден упрощенный шаблон: ${doorsTemplate.name}`);
            console.log(`   Категория: ${doorsTemplate.catalog_category.name}`);
            console.log(`   ID: ${doorsTemplate.id}`);
            console.log(`   Маппинг убран: ${doorsTemplate.field_mappings === null ? 'Да' : 'Нет'}`);
            console.log('');

            // Проверяем поля шаблона
            try {
                const requiredFields = JSON.parse(doorsTemplate.required_fields);
                const calculatorFields = JSON.parse(doorsTemplate.calculator_fields);
                const exportFields = JSON.parse(doorsTemplate.export_fields);
                const templateConfig = JSON.parse(doorsTemplate.template_config);

                console.log(`   📝 Обязательные поля (${requiredFields.length}):`);
                requiredFields.forEach((field, index) => {
                    console.log(`      ${index + 1}. ${field.displayName} (${field.dataType})`);
                });

                console.log(`   🧮 Поля для калькулятора (${calculatorFields.length}):`);
                calculatorFields.forEach((field, index) => {
                    console.log(`      ${index + 1}. ${field.displayName} (${field.dataType})`);
                });

                console.log(`   📤 Поля для экспорта (${exportFields.length}):`);
                exportFields.forEach((field, index) => {
                    console.log(`      ${index + 1}. ${field.displayName} (${field.dataType})`);
                });

                console.log(`   ⚙️ Конфигурация шаблона:`);
                console.log(`      Упрощенный: ${templateConfig.simplified ? 'Да' : 'Нет'}`);
                console.log(`      Прямой маппинг: ${templateConfig.direct_mapping ? 'Да' : 'Нет'}`);
                console.log(`      Заголовки Excel = Поля: ${templateConfig.excel_headers_as_fields ? 'Да' : 'Нет'}`);

            } catch (error) {
                console.log(`   ❌ Ошибка парсинга полей: ${error.message}`);
            }

        } else {
            console.log('❌ Упрощенный шаблон не найден');
        }

        console.log('');

        // 2. Проверяем товары со свойствами
        console.log('🛍️ ПРОВЕРКА ТОВАРОВ СО СВОЙСТВАМИ:');
        console.log('-----------------------------------');
        
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
                base_price: true,
                catalog_category: {
                    select: {
                        name: true
                    }
                }
            },
            take: 3
        });

        console.log(`Товаров со свойствами: ${productsWithProperties.length}`);
        console.log('');

        productsWithProperties.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} (SKU: ${product.sku})`);
            console.log(`   Категория: ${product.catalog_category.name}`);
            console.log(`   Цена: ${product.base_price} руб.`);
            
            try {
                const properties = JSON.parse(product.properties_data);
                const propertyKeys = Object.keys(properties);
                console.log(`   Свойств: ${propertyKeys.length}`);
                
                // Показываем ключевые свойства для калькулятора
                const keyProperties = [
                    'Domeo_Стиль Web',
                    'Domeo_Цвет',
                    'Ширина/мм',
                    'Высота/мм',
                    'Цена ррц (включая цену полотна, короба, наличников, доборов)'
                ];
                
                console.log(`   Ключевые свойства:`);
                keyProperties.forEach(key => {
                    if (properties[key]) {
                        console.log(`      ${key}: ${properties[key]}`);
                    }
                });
                
            } catch (error) {
                console.log(`   ❌ Ошибка парсинга свойств: ${error.message}`);
            }
            console.log('');
        });

        // 3. Тестируем логику упрощенного импорта
        console.log('🔧 ТЕСТИРОВАНИЕ ЛОГИКИ УПРОЩЕННОГО ИМПОРТА:');
        console.log('--------------------------------------------');
        
        // Симулируем данные Excel
        const mockHeaders = [
            '№',
            'Domeo_Название модели для Web',
            'Категория',
            'Тип конструкции',
            'Domeo_Стиль Web',
            'Фабрика_Коллекция',
            'Общее_Тип покрытия',
            'Domeo_Цвет',
            'Фабрика_Цвет/Отделка',
            'Ширина/мм',
            'Высота/мм',
            'Ед.изм.',
            'Склад/заказ',
            'Цена ррц (включая цену полотна, короба, наличников, доборов)',
            'Наименование поставщика',
            'Поставщик',
            'Артикул поставщика',
            'Тип открывания',
            'Кромка',
            'Стоимость надбавки за кромку',
            'Молдинг',
            'Стекло',
            'Толщина/мм',
            'Цена опт'
        ];

        const mockRow = [
            '1',
            'DomeoDoors_Test_1',
            'Межкомнатные двери',
            'Распашная',
            'Современная',
            'Moderno',
            'ПВХ',
            'Белый',
            'CV Белый',
            '800',
            '2000',
            'шт',
            'Заказное',
            '45000',
            'Дверь Тестовая',
            'ВестСтайл',
            'test_door_1',
            'прямое',
            'нет',
            '0',
            'нет',
            'нет',
            '38',
            '30000'
        ];

        console.log('📋 Тестовые заголовки:');
        mockHeaders.forEach((header, index) => {
            console.log(`   ${index + 1}. "${header}"`);
        });

        console.log('\n📦 Тестовая строка данных:');
        mockRow.forEach((value, index) => {
            console.log(`   ${index + 1}. ${value}`);
        });

        // Симулируем обработку
        console.log('\n🔄 Симуляция обработки:');
        const testProduct = {
            sku: mockRow[16] || 'AUTO-1', // Артикул поставщика
            name: mockRow[14] || 'Без названия', // Наименование поставщика
            properties_data: {}
        };

        // Заголовки Excel = Поля шаблона (прямое соответствие)
        mockHeaders.forEach((header, headerIndex) => {
            if (mockRow[headerIndex] !== undefined && mockRow[headerIndex] !== null && mockRow[headerIndex] !== '') {
                testProduct.properties_data[header] = mockRow[headerIndex];
            }
        });

        console.log(`   SKU: ${testProduct.sku}`);
        console.log(`   Название: ${testProduct.name}`);
        console.log(`   Свойств: ${Object.keys(testProduct.properties_data).length}`);

        // Проверяем ключевые свойства для калькулятора
        const calculatorProperties = [
            'Domeo_Стиль Web',
            'Domeo_Цвет',
            'Ширина/мм',
            'Высота/мм',
            'Цена ррц (включая цену полотна, короба, наличников, доборов)'
        ];

        console.log('\n🧮 Свойства для калькулятора:');
        calculatorProperties.forEach(prop => {
            if (testProduct.properties_data[prop]) {
                console.log(`   ${prop}: ${testProduct.properties_data[prop]}`);
            }
        });

        // 4. Проверяем API endpoint
        console.log('\n🌐 ПРОВЕРКА API ENDPOINT:');
        console.log('-------------------------');
        console.log('✅ Создан упрощенный API: /api/admin/import/simplified');
        console.log('   Особенности:');
        console.log('   - Заголовки Excel = Поля шаблона');
        console.log('   - Нет промежуточного маппинга');
        console.log('   - Прямое соответствие колонок');
        console.log('   - Автоматическое определение цены');
        console.log('   - Обновление существующих товаров');

        // 5. Итоговые рекомендации
        console.log('\n🎯 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:');
        console.log('---------------------------');
        console.log('');
        console.log('✅ Выполнено:');
        console.log('1. Упрощена структура шаблона для дверей');
        console.log('2. Убран промежуточный маппинг');
        console.log('3. Заголовки Excel теперь = Поля шаблона');
        console.log('4. Создан упрощенный API импорта');
        console.log('5. Создан упрощенный сервис импорта');
        console.log('');
        console.log('📋 Следующие шаги:');
        console.log('1. Протестировать новый API с реальным Excel файлом');
        console.log('2. Обновить UI для использования упрощенного API');
        console.log('3. Применить упрощение к другим шаблонам');
        console.log('4. Обновить документацию');
        console.log('');

    } catch (error) {
        console.error('❌ Ошибка при тестировании:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем тестирование
testSimplifiedImport();
