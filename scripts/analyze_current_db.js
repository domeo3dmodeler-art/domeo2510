const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzeCurrentDatabase() {
    console.log('🔍 АНАЛИЗ ТЕКУЩЕЙ СТРУКТУРЫ БАЗЫ ДАННЫХ DOMEO');
    console.log('================================================');
    console.log('');

    try {
        // 1. Анализ категорий каталога
        console.log('📁 КАТЕГОРИИ КАТАЛОГА:');
        console.log('----------------------');
        
        const categories = await prisma.catalogCategory.findMany({
            include: {
                _count: {
                    select: {
                        products: true,
                        subcategories: true
                    }
                }
            },
            orderBy: {
                level: 'asc'
            }
        });

        console.log(`Всего категорий: ${categories.length}`);
        console.log('');

        // Показываем структуру категорий
        categories.forEach(category => {
            const indent = '  '.repeat(category.level);
            console.log(`${indent}📂 ${category.name} (ID: ${category.id})`);
            console.log(`${indent}   Товаров: ${category._count.products}, Подкатегорий: ${category._count.subcategories}`);
            console.log(`${indent}   Путь: ${category.path}`);
            console.log('');
        });

        // 2. Анализ товаров
        console.log('🛍️ ТОВАРЫ:');
        console.log('-----------');
        
        const productsCount = await prisma.product.count();
        const activeProductsCount = await prisma.product.count({
            where: { is_active: true }
        });
        
        console.log(`Всего товаров: ${productsCount}`);
        console.log(`Активных товаров: ${activeProductsCount}`);
        console.log('');

        // Анализ свойств товаров
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
                catalog_category_id: true
            },
            take: 10
        });

        console.log(`Товаров со свойствами: ${productsWithProperties.length}`);
        console.log('');

        // Показываем примеры свойств
        if (productsWithProperties.length > 0) {
            console.log('📋 ПРИМЕРЫ СВОЙСТВ ТОВАРОВ:');
            console.log('----------------------------');
            
            productsWithProperties.forEach((product, index) => {
                console.log(`${index + 1}. ${product.name} (ID: ${product.id})`);
                try {
                    const properties = JSON.parse(product.properties_data);
                    Object.entries(properties).forEach(([key, value]) => {
                        console.log(`   ${key}: ${value}`);
                    });
                } catch (e) {
                    console.log(`   Ошибка парсинга JSON: ${product.properties_data}`);
                }
                console.log('');
            });
        }

        // 3. Анализ свойств товаров (ProductProperty)
        console.log('🏷️ СВОЙСТВА ТОВАРОВ (ProductProperty):');
        console.log('--------------------------------------');
        
        const productProperties = await prisma.productProperty.findMany({
            include: {
                _count: {
                    select: {
                        category_assignments: true
                    }
                }
            }
        });

        console.log(`Всего свойств: ${productProperties.length}`);
        console.log('');

        productProperties.forEach(property => {
            console.log(`🏷️ ${property.name} (${property.type})`);
            console.log(`   Описание: ${property.description || 'Нет'}`);
            console.log(`   Обязательное: ${property.is_required ? 'Да' : 'Нет'}`);
            console.log(`   Активное: ${property.is_active ? 'Да' : 'Нет'}`);
            console.log(`   Назначено категориям: ${property._count.category_assignments}`);
            if (property.options) {
                try {
                    const options = JSON.parse(property.options);
                    console.log(`   Варианты: ${options.join(', ')}`);
                } catch (e) {
                    console.log(`   Варианты: ${property.options}`);
                }
            }
            console.log('');
        });

        // 4. Анализ назначений свойств категориям
        console.log('🔗 НАЗНАЧЕНИЯ СВОЙСТВ КАТЕГОРИЯМ:');
        console.log('----------------------------------');
        
        const assignments = await prisma.categoryPropertyAssignment.findMany({
            include: {
                product_property: true,
                catalog_category: true
            }
        });

        console.log(`Всего назначений: ${assignments.length}`);
        console.log('');

        // Группируем по категориям
        const assignmentsByCategory = {};
        assignments.forEach(assignment => {
            const categoryName = assignment.catalog_category.name;
            if (!assignmentsByCategory[categoryName]) {
                assignmentsByCategory[categoryName] = [];
            }
            assignmentsByCategory[categoryName].push(assignment);
        });

        Object.entries(assignmentsByCategory).forEach(([categoryName, categoryAssignments]) => {
            console.log(`📂 ${categoryName}:`);
            categoryAssignments.forEach(assignment => {
                console.log(`   🏷️ ${assignment.product_property.name} (${assignment.product_property.type})`);
                console.log(`      Обязательное: ${assignment.is_required ? 'Да' : 'Нет'}`);
                console.log(`      Для калькулятора: ${assignment.is_for_calculator ? 'Да' : 'Нет'}`);
                console.log(`      Для экспорта: ${assignment.is_for_export ? 'Да' : 'Нет'}`);
            });
            console.log('');
        });

        // 5. Анализ документов
        console.log('📄 ДОКУМЕНТЫ:');
        console.log('-------------');
        
        const quotesCount = await prisma.quote.count();
        const ordersCount = await prisma.order.count();
        const invoicesCount = await prisma.invoice.count();
        
        console.log(`Коммерческих предложений: ${quotesCount}`);
        console.log(`Заказов: ${ordersCount}`);
        console.log(`Счетов: ${invoicesCount}`);
        console.log('');

        // 6. Анализ изображений товаров
        console.log('🖼️ ИЗОБРАЖЕНИЯ ТОВАРОВ:');
        console.log('----------------------');
        
        const imagesCount = await prisma.productImage.count();
        const productsWithImages = await prisma.product.count({
            where: {
                images: {
                    some: {}
                }
            }
        });
        
        console.log(`Всего изображений: ${imagesCount}`);
        console.log(`Товаров с изображениями: ${productsWithImages}`);
        console.log('');

        // 7. Общая статистика
        console.log('📊 ОБЩАЯ СТАТИСТИКА:');
        console.log('-------------------');
        
        const totalRecords = await prisma.$queryRaw`
            SELECT 
                (SELECT COUNT(*) FROM catalog_categories) as categories,
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM product_properties) as properties,
                (SELECT COUNT(*) FROM category_property_assignments) as assignments,
                (SELECT COUNT(*) FROM product_images) as images,
                (SELECT COUNT(*) FROM quotes) as quotes,
                (SELECT COUNT(*) FROM orders) as orders,
                (SELECT COUNT(*) FROM invoices) as invoices
        `;

        console.log('Записей в таблицах:');
        console.log(`  📁 Категории: ${totalRecords[0].categories}`);
        console.log(`  🛍️ Товары: ${totalRecords[0].products}`);
        console.log(`  🏷️ Свойства: ${totalRecords[0].properties}`);
        console.log(`  🔗 Назначения: ${totalRecords[0].assignments}`);
        console.log(`  🖼️ Изображения: ${totalRecords[0].images}`);
        console.log(`  📄 Предложения: ${totalRecords[0].quotes}`);
        console.log(`  📦 Заказы: ${totalRecords[0].orders}`);
        console.log(`  💰 Счета: ${totalRecords[0].invoices}`);
        console.log('');

        // 8. Проблемы и рекомендации
        console.log('⚠️ ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ:');
        console.log('----------------------');
        
        // Проверяем товары без свойств
        const productsWithoutProperties = await prisma.product.count({
            where: {
                OR: [
                    { properties_data: '{}' },
                    { properties_data: null }
                ]
            }
        });
        
        if (productsWithoutProperties > 0) {
            console.log(`❌ Товаров без свойств: ${productsWithoutProperties}`);
        }
        
        // Проверяем категории без товаров
        const categoriesWithoutProducts = await prisma.catalogCategory.count({
            where: {
                products: {
                    none: {}
                }
            }
        });
        
        if (categoriesWithoutProducts > 0) {
            console.log(`❌ Категорий без товаров: ${categoriesWithoutProducts}`);
        }
        
        // Проверяем свойства без назначений
        const propertiesWithoutAssignments = await prisma.productProperty.count({
            where: {
                category_assignments: {
                    none: {}
                }
            }
        });
        
        if (propertiesWithoutAssignments > 0) {
            console.log(`❌ Свойств без назначений: ${propertiesWithoutAssignments}`);
        }

        console.log('');
        console.log('✅ Анализ завершен успешно!');

    } catch (error) {
        console.error('❌ Ошибка при анализе базы данных:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Запускаем анализ
analyzeCurrentDatabase();
