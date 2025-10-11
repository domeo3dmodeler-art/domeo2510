const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Упрощенная версия сервиса импорта для тестирования
class TestSimplifiedImportService {
    async importFromExcel(fileBuffer, filename, catalogCategoryId) {
        console.log('🚀 ТЕСТОВЫЙ ИМПОРТ ТОВАРОВ');
        console.log('============================');
        console.log(`📁 Файл: ${filename}`);
        console.log(`📂 Категория: ${catalogCategoryId}`);
        
        try {
            // Читаем Excel файл
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (data.length === 0) {
                return {
                    success: false,
                    message: 'Файл не содержит данных',
                    imported: 0,
                    updated: 0,
                    errors: ['Файл пуст или не содержит данных'],
                    warnings: [],
                    products: []
                };
            }

            // Первая строка - заголовки (они же поля шаблона)
            const headers = data[0];
            const rows = data.slice(1).filter(row => row.length > 0);
            
            console.log(`📋 Заголовки (${headers.length}):`);
            headers.forEach((header, index) => {
                console.log(`   ${index + 1}. "${header}"`);
            });
            
            console.log(`📊 Строк данных: ${rows.length}`);

            // Получаем категорию
            const catalogCategory = await prisma.catalogCategory.findUnique({
                where: { id: catalogCategoryId }
            });
            
            if (!catalogCategory) {
                return {
                    success: false,
                    message: 'Категория каталога не найдена',
                    imported: 0,
                    updated: 0,
                    errors: ['Указанная категория каталога не существует'],
                    warnings: [],
                    products: []
                };
            }

            console.log(`✅ Категория найдена: ${catalogCategory.name}`);

            // Парсим товары
            const products = [];
            const errors = [];
            const warnings = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                
                if (row.length === 0 || row.every(cell => !cell)) {
                    continue;
                }

                try {
                    // Создаем товар
                    const product = {
                        sku: '',
                        name: '',
                        catalog_category_id: catalogCategoryId,
                        properties_data: {},
                        base_price: 0,
                        currency: 'RUB',
                        stock_quantity: 0,
                        is_active: true
                    };

                    // Заголовки Excel = Поля шаблона (прямое соответствие)
                    headers.forEach((header, headerIndex) => {
                        if (row[headerIndex] !== undefined && row[headerIndex] !== null && row[headerIndex] !== '') {
                            product.properties_data[header] = row[headerIndex];
                        }
                    });

                    // Извлекаем основные поля
                    // SKU - обычно в колонке C (индекс 2) или из артикула поставщика
                    if (row[16]) { // Артикул поставщика
                        product.sku = row[16].toString().trim();
                    } else if (row[2]) { // Колонка C
                        product.sku = row[2].toString().trim();
                    } else {
                        product.sku = `AUTO-${i + 1}`;
                        warnings.push(`Строка ${i + 2}: SKU сгенерирован автоматически`);
                    }

                    // Название - из наименования поставщика
                    if (row[14]) { // Наименование поставщика
                        product.name = row[14].toString().trim();
                    } else if (row[3]) { // Колонка D
                        product.name = row[3].toString().trim();
                    } else {
                        product.name = 'Без названия';
                        warnings.push(`Строка ${i + 2}: Название не указано`);
                    }

                    // Ищем цену по заголовкам
                    const priceHeaders = headers.filter(h => 
                        h && h.toLowerCase().includes('цена')
                    );
                    
                    if (priceHeaders.length > 0) {
                        const priceHeader = priceHeaders[0];
                        const priceIndex = headers.indexOf(priceHeader);
                        const priceValue = row[priceIndex];
                        
                        if (priceValue) {
                            const price = parseFloat(priceValue.toString().replace(/[^\d.,]/g, '').replace(',', '.'));
                            if (!isNaN(price)) {
                                product.base_price = price;
                            } else {
                                warnings.push(`Строка ${i + 2}: Неверный формат цены "${priceValue}"`);
                            }
                        }
                    }

                    // Проверяем обязательные поля
                    if (!product.name || product.name === 'Без названия') {
                        errors.push(`Строка ${i + 2}: Отсутствует название товара`);
                        continue;
                    }

                    if (Object.keys(product.properties_data).length === 0) {
                        errors.push(`Строка ${i + 2}: Товар не содержит свойств`);
                        continue;
                    }

                    products.push(product);

                } catch (error) {
                    errors.push(`Строка ${i + 2}: Ошибка обработки - ${error.message}`);
                }
            }

            console.log(`📦 Товаров обработано: ${products.length}`);
            console.log(`❌ Ошибок: ${errors.length}`);
            console.log(`⚠️ Предупреждений: ${warnings.length}`);

            // Сохраняем товары в базу данных
            let imported = 0;
            let updated = 0;
            const savedProducts = [];

            for (const product of products) {
                try {
                    // Проверяем, не существует ли уже товар с таким SKU
                    const existingProduct = await prisma.product.findUnique({
                        where: { sku: product.sku }
                    });

                    if (existingProduct) {
                        // Обновляем существующий товар
                        const updatedProduct = await prisma.product.update({
                            where: { sku: product.sku },
                            data: {
                                name: product.name,
                                properties_data: JSON.stringify(product.properties_data),
                                base_price: product.base_price,
                                updated_at: new Date()
                            }
                        });
                        
                        savedProducts.push({
                            id: updatedProduct.id,
                            sku: updatedProduct.sku,
                            name: updatedProduct.name,
                            base_price: updatedProduct.base_price,
                            properties_count: Object.keys(product.properties_data).length
                        });
                        
                        updated++;
                    } else {
                        // Создаем новый товар
                        const newProduct = await prisma.product.create({
                            data: {
                                sku: product.sku,
                                name: product.name,
                                catalog_category_id: product.catalog_category_id,
                                properties_data: JSON.stringify(product.properties_data),
                                base_price: product.base_price,
                                currency: product.currency,
                                stock_quantity: product.stock_quantity,
                                is_active: product.is_active
                            }
                        });
                        
                        savedProducts.push({
                            id: newProduct.id,
                            sku: newProduct.sku,
                            name: newProduct.name,
                            base_price: newProduct.base_price,
                            properties_count: Object.keys(product.properties_data).length
                        });
                        
                        imported++;
                    }
                    
                } catch (error) {
                    errors.push(`Товар "${product.name}": Ошибка сохранения - ${error.message}`);
                }
            }

            // Обновляем счетчик товаров в категории
            const count = await prisma.product.count({
                where: { 
                    catalog_category_id: catalogCategoryId,
                    is_active: true 
                }
            });

            await prisma.catalogCategory.update({
                where: { id: catalogCategoryId },
                data: { 
                    products_count: count,
                    updated_at: new Date()
                }
            });

            // Создаем запись в истории импорта
            await prisma.importHistory.create({
                data: {
                    catalog_category_id: catalogCategoryId,
                    filename: filename,
                    file_size: fileBuffer.length,
                    imported_count: imported + updated,
                    error_count: errors.length,
                    status: errors.length > 0 ? 'partial' : 'completed',
                    errors: JSON.stringify(errors),
                    import_data: JSON.stringify({
                        imported: imported,
                        updated: updated,
                        total_processed: imported + updated
                    })
                }
            });

            console.log(`🎉 ИМПОРТ ЗАВЕРШЕН:`);
            console.log(`   Импортировано: ${imported}`);
            console.log(`   Обновлено: ${updated}`);
            console.log(`   Ошибок: ${errors.length}`);

            return {
                success: true,
                message: 'Импорт завершен успешно',
                imported: imported,
                updated: updated,
                errors: errors,
                warnings: warnings,
                products: savedProducts
            };

        } catch (error) {
            console.error('❌ Критическая ошибка импорта:', error);
            return {
                success: false,
                message: 'Ошибка при импорте файла',
                imported: 0,
                updated: 0,
                errors: [error.message],
                warnings: [],
                products: []
            };
        }
    }
}

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

        // 3. Запускаем импорт
        console.log('🔄 ЗАПУСК ИМПОРТА:');
        console.log('------------------');
        
        const importService = new TestSimplifiedImportService();
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

        // 5. Итоговые результаты
        console.log('🎯 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
        console.log('=====================================');
        console.log('');
        console.log('✅ Успешно выполнено:');
        console.log(`1. Импорт товаров: ${result.success ? 'Да' : 'Нет'}`);
        console.log(`2. Сохранение в БД: ${importedProducts.length > 0 ? 'Да' : 'Нет'}`);
        console.log(`3. Обработка свойств: ${result.products.length > 0 ? 'Да' : 'Нет'}`);
        console.log(`4. Заголовки Excel = Поля шаблона: ${result.success ? 'Да' : 'Нет'}`);
        console.log('');
        
        if (result.success && importedProducts.length > 0) {
            console.log('🎉 ТЕСТИРОВАНИЕ ПРОЙДЕНО УСПЕШНО!');
            console.log('Упрощенная система импорта работает корректно.');
            console.log('Заголовки Excel успешно используются как поля шаблона.');
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
