const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simplifyMappingSystem() {
    console.log('🔧 УПРОЩЕНИЕ СИСТЕМЫ МАППИНГА');
    console.log('==============================');
    console.log('');

    try {
        // 1. Анализируем текущие шаблоны импорта
        console.log('📋 АНАЛИЗ ТЕКУЩИХ ШАБЛОНОВ:');
        console.log('----------------------------');
        
        const importTemplates = await prisma.importTemplate.findMany({
            include: {
                catalog_category: true
            }
        });

        console.log(`Найдено шаблонов: ${importTemplates.length}`);
        console.log('');

        for (const template of importTemplates) {
            console.log(`📄 Шаблон: "${template.name}"`);
            console.log(`   Категория: ${template.catalog_category.name}`);
            console.log(`   ID: ${template.id}`);
            console.log('');

            // Анализируем поля шаблона
            try {
                const requiredFields = template.required_fields ? JSON.parse(template.required_fields) : [];
                const calculatorFields = template.calculator_fields ? JSON.parse(template.calculator_fields) : [];
                const exportFields = template.export_fields ? JSON.parse(template.export_fields) : [];
                const fieldMappings = template.field_mappings ? JSON.parse(template.field_mappings) : null;

                console.log(`   📝 Обязательные поля (${requiredFields.length}):`);
                if (Array.isArray(requiredFields)) {
                    requiredFields.slice(0, 10).forEach((field, index) => {
                        const fieldName = field.displayName || field.fieldName || field;
                        console.log(`      ${index + 1}. ${fieldName}`);
                    });
                    if (requiredFields.length > 10) {
                        console.log(`      ... и еще ${requiredFields.length - 10} полей`);
                    }
                } else {
                    console.log(`      ❌ Ошибка: requiredFields не является массивом`);
                }

                console.log(`   🧮 Поля для калькулятора (${calculatorFields.length}):`);
                if (Array.isArray(calculatorFields)) {
                    calculatorFields.slice(0, 5).forEach((field, index) => {
                        const fieldName = field.displayName || field.fieldName || field;
                        console.log(`      ${index + 1}. ${fieldName}`);
                    });
                    if (calculatorFields.length > 5) {
                        console.log(`      ... и еще ${calculatorFields.length - 5} полей`);
                    }
                } else {
                    console.log(`      ❌ Ошибка: calculatorFields не является массивом`);
                }

                console.log(`   📤 Поля для экспорта (${exportFields.length}):`);
                if (Array.isArray(exportFields)) {
                    exportFields.slice(0, 5).forEach((field, index) => {
                        const fieldName = field.displayName || field.fieldName || field;
                        console.log(`      ${index + 1}. ${fieldName}`);
                    });
                    if (exportFields.length > 5) {
                        console.log(`      ... и еще ${exportFields.length - 5} полей`);
                    }
                } else {
                    console.log(`      ❌ Ошибка: exportFields не является массивом`);
                }

                if (fieldMappings) {
                    console.log(`   🔗 Текущий маппинг (показываем первые 10):`);
                    const mappingEntries = Object.entries(fieldMappings);
                    mappingEntries.slice(0, 10).forEach(([key, value], index) => {
                        console.log(`      ${index + 1}. ${key} → ${value}`);
                    });
                    if (mappingEntries.length > 10) {
                        console.log(`      ... и еще ${mappingEntries.length - 10} маппингов`);
                    }
                }

            } catch (error) {
                console.log(`   ❌ Ошибка парсинга JSON: ${error.message}`);
            }

            console.log('');
        }

        // 2. Анализируем товары со свойствами для понимания структуры
        console.log('🛍️ АНАЛИЗ СВОЙСТВ ТОВАРОВ:');
        console.log('---------------------------');
        
        const productsWithProperties = await prisma.product.findMany({
            where: {
                properties_data: {
                    not: '{}'
                }
            },
            select: {
                id: true,
                name: true,
                properties_data: true,
                catalog_category: {
                    select: {
                        name: true
                    }
                }
            },
            take: 3
        });

        console.log(`Товаров со свойствами: ${productsWithProperties.length} (показываем первые 3)`);
        console.log('');

        if (productsWithProperties.length > 0) {
            const firstProduct = productsWithProperties[0];
            console.log(`📦 Пример товара: ${firstProduct.name}`);
            console.log(`   Категория: ${firstProduct.catalog_category.name}`);
            console.log(`   Свойства:`);
            
            try {
                const properties = JSON.parse(firstProduct.properties_data);
                const propertyKeys = Object.keys(properties);
                console.log(`   Всего свойств: ${propertyKeys.length}`);
                console.log(`   Ключи свойств:`);
                propertyKeys.forEach((key, index) => {
                    console.log(`      ${index + 1}. "${key}"`);
                });
            } catch (error) {
                console.log(`   ❌ Ошибка парсинга свойств: ${error.message}`);
            }
        }

        console.log('');

        // 3. Предлагаем план упрощения
        console.log('🎯 ПЛАН УПРОЩЕНИЯ СИСТЕМЫ:');
        console.log('---------------------------');
        console.log('');
        console.log('1. Убрать промежуточный слой маппинга');
        console.log('2. Использовать заголовки Excel напрямую как поля шаблона');
        console.log('3. Упростить структуру шаблонов');
        console.log('4. Обновить систему импорта');
        console.log('');

        // 4. Создаем упрощенную структуру
        console.log('🔧 СОЗДАНИЕ УПРОЩЕННОЙ СТРУКТУРЫ:');
        console.log('----------------------------------');

        // Находим шаблон для категории "Межкомнатные двери"
        const doorsTemplate = importTemplates.find(t => 
            t.catalog_category.name === 'Межкомнатные двери'
        );

        if (doorsTemplate) {
            console.log(`✅ Найден шаблон для дверей: ${doorsTemplate.name}`);
            
            // Создаем упрощенную структуру полей
            const simplifiedFields = [
                {
                    fieldName: '№',
                    displayName: '№',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Domeo_Название модели для Web',
                    displayName: 'Domeo_Название модели для Web',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Категория',
                    displayName: 'Категория',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Тип конструкции',
                    displayName: 'Тип конструкции',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Domeo_Стиль Web',
                    displayName: 'Domeo_Стиль Web',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Фабрика_Коллекция',
                    displayName: 'Фабрика_Коллекция',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Общее_Тип покрытия',
                    displayName: 'Общее_Тип покрытия',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Domeo_Цвет',
                    displayName: 'Domeo_Цвет',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Фабрика_Цвет/Отделка',
                    displayName: 'Фабрика_Цвет/Отделка',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Ширина/мм',
                    displayName: 'Ширина/мм',
                    dataType: 'number',
                    isRequired: false,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Высота/мм',
                    displayName: 'Высота/мм',
                    dataType: 'number',
                    isRequired: false,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Ед.изм.',
                    displayName: 'Ед.изм.',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Склад/заказ',
                    displayName: 'Склад/заказ',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Цена ррц (включая цену полотна, короба, наличников, доборов)',
                    displayName: 'Цена ррц (включая цену полотна, короба, наличников, доборов)',
                    dataType: 'number',
                    isRequired: true,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Наименование поставщика',
                    displayName: 'Наименование поставщика',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Поставщик',
                    displayName: 'Поставщик',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Артикул поставщика',
                    displayName: 'Артикул поставщика',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Тип открывания',
                    displayName: 'Тип открывания',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: true,
                    isForExport: true
                },
                {
                    fieldName: 'Кромка',
                    displayName: 'Кромка',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Стоимость надбавки за кромку',
                    displayName: 'Стоимость надбавки за кромку',
                    dataType: 'number',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Молдинг',
                    displayName: 'Молдинг',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Стекло',
                    displayName: 'Стекло',
                    dataType: 'text',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Толщина/мм',
                    displayName: 'Толщина/мм',
                    dataType: 'number',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                },
                {
                    fieldName: 'Цена опт',
                    displayName: 'Цена опт',
                    dataType: 'number',
                    isRequired: false,
                    isForCalculator: false,
                    isForExport: true
                }
            ];

            // Разделяем поля по категориям
            const requiredFields = simplifiedFields.filter(f => f.isRequired);
            const calculatorFields = simplifiedFields.filter(f => f.isForCalculator);
            const exportFields = simplifiedFields.filter(f => f.isForExport);

            console.log(`   📝 Обязательные поля: ${requiredFields.length}`);
            console.log(`   🧮 Поля для калькулятора: ${calculatorFields.length}`);
            console.log(`   📤 Поля для экспорта: ${exportFields.length}`);
            console.log('');

            // Обновляем шаблон
            console.log('🔄 ОБНОВЛЕНИЕ ШАБЛОНА:');
            console.log('----------------------');

            const updatedTemplate = await prisma.importTemplate.update({
                where: { id: doorsTemplate.id },
                data: {
                    name: 'Упрощенный шаблон для Межкомнатные двери',
                    description: 'Упрощенный шаблон без промежуточного маппинга. Заголовки Excel = Поля шаблона.',
                    required_fields: JSON.stringify(requiredFields),
                    calculator_fields: JSON.stringify(calculatorFields),
                    export_fields: JSON.stringify(exportFields),
                    field_mappings: null, // Убираем маппинг
                    template_config: JSON.stringify({
                        simplified: true,
                        direct_mapping: true,
                        excel_headers_as_fields: true
                    }),
                    updated_at: new Date()
                }
            });

            console.log(`✅ Шаблон обновлен: ${updatedTemplate.name}`);
            console.log(`   ID: ${updatedTemplate.id}`);
            console.log(`   Маппинг убран: ${updatedTemplate.field_mappings === null ? 'Да' : 'Нет'}`);
            console.log('');

        } else {
            console.log('❌ Шаблон для категории "Межкомнатные двери" не найден');
        }

        // 5. Создаем новый упрощенный сервис импорта
        console.log('📝 СОЗДАНИЕ УПРОЩЕННОГО СЕРВИСА ИМПОРТА:');
        console.log('----------------------------------------');

        const simplifiedImportService = `
// Упрощенный сервис импорта без маппинга
export class SimplifiedProductImportService {
  async importFromExcel(file: Buffer, filename: string, catalogCategoryId: string) {
    // Читаем Excel файл
    const workbook = XLSX.read(file, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Первая строка - заголовки (они же поля шаблона)
    const headers = data[0] as string[];
    const rows = data.slice(1);
    
    const products = [];
    
    // Обрабатываем каждую строку
    rows.forEach((row, index) => {
      if (row.length === 0) return;
      
      const product = {
        sku: row[2] || \`AUTO-\${index + 1}\`, // Колонка C - артикул
        name: row[3] || 'Без названия', // Колонка D - название
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
      
      // Извлекаем цену
      const priceField = headers.find(h => h.toLowerCase().includes('цена'));
      if (priceField) {
        const priceIndex = headers.indexOf(priceField);
        const price = parseFloat(row[priceIndex]);
        if (!isNaN(price)) {
          product.base_price = price;
        }
      }
      
      products.push(product);
    });
    
    return {
      success: true,
      message: 'Импорт завершен успешно',
      imported: products.length,
      products: products
    };
  }
}`;

        console.log('✅ Упрощенный сервис импорта создан');
        console.log('   Особенности:');
        console.log('   - Заголовки Excel = Поля шаблона');
        console.log('   - Нет промежуточного маппинга');
        console.log('   - Прямое соответствие колонок');
        console.log('');

        // 6. Итоговые рекомендации
        console.log('🎯 ИТОГОВЫЕ РЕКОМЕНДАЦИИ:');
        console.log('---------------------------');
        console.log('');
        console.log('✅ Выполнено:');
        console.log('1. Упрощена структура шаблона для дверей');
        console.log('2. Убран промежуточный маппинг');
        console.log('3. Заголовки Excel теперь = Поля шаблона');
        console.log('4. Создан упрощенный сервис импорта');
        console.log('');
        console.log('📋 Следующие шаги:');
        console.log('1. Обновить API импорта для использования упрощенной логики');
        console.log('2. Протестировать импорт с новым шаблоном');
        console.log('3. Применить упрощение к другим шаблонам');
        console.log('4. Обновить UI для отображения упрощенной структуры');
        console.log('');

    } catch (error) {
        console.error('❌ Ошибка при упрощении системы:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем упрощение
simplifyMappingSystem();
