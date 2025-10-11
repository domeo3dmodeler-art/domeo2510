const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function testSimplifiedAPI() {
    console.log('🧪 ТЕСТИРОВАНИЕ УПРОЩЕННОГО API ИМПОРТА');
    console.log('=========================================');
    console.log('');

    try {
        // 1. Получаем ID категории "Межкомнатные двери"
        console.log('📂 ПОИСК КАТЕГОРИИ:');
        console.log('-------------------');
        
        const doorsCategory = await prisma.catalogCategory.findFirst({
            where: {
                name: 'Межкомнатные двери'
            }
        });

        if (!doorsCategory) {
            console.log('❌ Категория "Межкомнатные двери" не найдена');
            return;
        }

        console.log(`✅ Найдена категория: ${doorsCategory.name}`);
        console.log(`   ID: ${doorsCategory.id}`);
        console.log('');

        // 2. Читаем тестовый Excel файл
        console.log('📊 ЧТЕНИЕ ТЕСТОВОГО ФАЙЛА:');
        console.log('---------------------------');
        
        const testFilepath = path.join(__dirname, '..', 'test_files', 'test_doors_import.xlsx');
        
        if (!fs.existsSync(testFilepath)) {
            console.log('❌ Тестовый файл не найден:', testFilepath);
            return;
        }

        const fileBuffer = fs.readFileSync(testFilepath);
        console.log(`✅ Файл прочитан: ${testFilepath}`);
        console.log(`   Размер: ${fileBuffer.length} байт`);
        console.log('');

        // 3. Симулируем импорт через упрощенный сервис
        console.log('🔄 СИМУЛЯЦИЯ ИМПОРТА:');
        console.log('---------------------');
        
        // Импортируем упрощенный сервис
        const { SimplifiedProductImportService } = require('../app/lib/services/simplified-product-import.service');
        
        const importService = new SimplifiedProductImportService();
        
        console.log('🚀 Запуск импорта...');
        const result = await importService.importFromExcel(
            fileBuffer,
            'test_doors_import.xlsx',
            doorsCategory.id
        );

        console.log('');
        console.log('📊 РЕЗУЛЬТАТЫ ИМПОРТА:');
        console.log('----------------------');
        console.log(`✅ Успех: ${result.success ? 'Да' : 'Нет'}`);
        console.log(`📝 Сообщение: ${result.message}`);
        console.log(`📦 Импортировано: ${result.imported}`);
        console.log(`🔄 Обновлено: ${result.updated}`);
        console.log(`❌ Ошибок: ${result.errors.length}`);
        console.log(`⚠️ Предупреждений: ${result.warnings.length}`);
        console.log('');

        if (result.errors.length > 0) {
            console.log('❌ ОШИБКИ:');
            result.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            console.log('');
        }

        if (result.warnings.length > 0) {
            console.log('⚠️ ПРЕДУПРЕЖДЕНИЯ:');
            result.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
            console.log('');
        }

        if (result.products.length > 0) {
            console.log('🛍️ ИМПОРТИРОВАННЫЕ ТОВАРЫ:');
            console.log('----------------------------');
            result.products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} (SKU: ${product.sku})`);
                console.log(`   ID: ${product.id}`);
                console.log(`   Цена: ${product.base_price} руб.`);
                console.log(`   Свойств: ${product.properties_count}`);
                console.log('');
            });
        }

        // 4. Проверяем товары в базе данных
        console.log('🔍 ПРОВЕРКА БАЗЫ ДАННЫХ:');
        console.log('-------------------------');
        
        const importedProducts = await prisma.product.findMany({
            where: {
                sku: {
                    startsWith: 'test_door_'
                }
            },
            select: {
                id: true,
                sku: true,
                name: true,
                base_price: true,
                properties_data: true,
                created_at: true,
                updated_at: true
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        console.log(`📦 Найдено товаров с тестовыми SKU: ${importedProducts.length}`);
        console.log('');

        importedProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} (SKU: ${product.sku})`);
            console.log(`   ID: ${product.id}`);
            console.log(`   Цена: ${product.base_price} руб.`);
            console.log(`   Создан: ${product.created_at.toLocaleString()}`);
            console.log(`   Обновлен: ${product.updated_at.toLocaleString()}`);
            
            try {
                const properties = JSON.parse(product.properties_data);
                const propertyKeys = Object.keys(properties);
                console.log(`   Свойств: ${propertyKeys.length}`);
                
                // Показываем ключевые свойства
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

        // 5. Проверяем обновление счетчика категории
        console.log('📊 ПРОВЕРКА СЧЕТЧИКА КАТЕГОРИИ:');
        console.log('--------------------------------');
        
        const updatedCategory = await prisma.catalogCategory.findUnique({
            where: { id: doorsCategory.id }
        });

        console.log(`📂 Категория: ${updatedCategory.name}`);
        console.log(`📦 Товаров в категории: ${updatedCategory.products_count}`);
        console.log(`🕒 Обновлена: ${updatedCategory.updated_at.toLocaleString()}`);
        console.log('');

        // 6. Проверяем историю импорта
        console.log('📋 ПРОВЕРКА ИСТОРИИ ИМПОРТА:');
        console.log('-----------------------------');
        
        const importHistory = await prisma.importHistory.findMany({
            where: {
                filename: 'test_doors_import.xlsx'
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 1
        });

        if (importHistory.length > 0) {
            const history = importHistory[0];
            console.log(`📄 Файл: ${history.filename}`);
            console.log(`📅 Дата: ${history.created_at.toLocaleString()}`);
            console.log(`📦 Импортировано: ${history.imported_count}`);
            console.log(`❌ Ошибок: ${history.error_count}`);
            console.log(`📊 Статус: ${history.status}`);
            console.log('');
        }

        // 7. Тестируем калькулятор с новыми данными
        console.log('🧮 ТЕСТИРОВАНИЕ КАЛЬКУЛЯТОРА:');
        console.log('------------------------------');
        
        // Ищем товары для тестирования калькулятора
        const calculatorTestProducts = await prisma.product.findMany({
            where: {
                sku: {
                    startsWith: 'test_door_'
                },
                properties_data: {
                    contains: 'Domeo_Стиль Web'
                }
            },
            take: 3
        });

        console.log(`🔍 Найдено товаров для тестирования калькулятора: ${calculatorTestProducts.length}`);
        console.log('');

        calculatorTestProducts.forEach((product, index) => {
            console.log(`Тест ${index + 1}: ${product.name}`);
            
            try {
                const properties = JSON.parse(product.properties_data);
                
                // Симулируем запрос калькулятора
                const style = properties['Domeo_Стиль Web'];
                const color = properties['Domeo_Цвет'];
                const width = properties['Ширина/мм'];
                const height = properties['Высота/мм'];
                const price = properties['Цена ррц (включая цену полотна, короба, наличников, доборов)'];
                
                console.log(`   Стиль: ${style}`);
                console.log(`   Цвет: ${color}`);
                console.log(`   Размер: ${width}x${height} мм`);
                console.log(`   Цена: ${price} руб.`);
                
                // Проверяем, что все необходимые свойства есть
                const requiredProps = [style, color, width, height, price];
                const missingProps = requiredProps.filter(prop => !prop);
                
                if (missingProps.length === 0) {
                    console.log(`   ✅ Все свойства для калькулятора присутствуют`);
                } else {
                    console.log(`   ❌ Отсутствуют свойства: ${missingProps.length}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Ошибка обработки свойств: ${error.message}`);
            }
            console.log('');
        });

        // 8. Итоговые результаты
        console.log('🎯 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
        console.log('=====================================');
        console.log('');
        console.log('✅ Успешно выполнено:');
        console.log(`1. Импорт товаров: ${result.success ? 'Да' : 'Нет'}`);
        console.log(`2. Сохранение в БД: ${importedProducts.length > 0 ? 'Да' : 'Нет'}`);
        console.log(`3. Обновление счетчика: ${updatedCategory.products_count > 0 ? 'Да' : 'Нет'}`);
        console.log(`4. Запись в историю: ${importHistory.length > 0 ? 'Да' : 'Нет'}`);
        console.log(`5. Свойства для калькулятора: ${calculatorTestProducts.length > 0 ? 'Да' : 'Нет'}`);
        console.log('');
        
        if (result.success && importedProducts.length > 0) {
            console.log('🎉 ТЕСТИРОВАНИЕ ПРОЙДЕНО УСПЕШНО!');
            console.log('Упрощенная система импорта работает корректно.');
        } else {
            console.log('❌ ТЕСТИРОВАНИЕ НЕ ПРОЙДЕНО');
            console.log('Требуется дополнительная отладка.');
        }

    } catch (error) {
        console.error('❌ Критическая ошибка тестирования:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем тестирование
testSimplifiedAPI();
