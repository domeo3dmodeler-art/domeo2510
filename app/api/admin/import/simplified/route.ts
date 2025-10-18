import { NextRequest, NextResponse } from "next/server";
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Упрощенный импорт без маппинга
export async function POST(req: NextRequest) {
    console.log('🚀 УПРОЩЕННЫЙ ИМПОРТ БЕЗ МАППИНГА');
    console.log('==================================');
    
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const categoryId = formData.get('category') as string;
        
        if (!file || !categoryId) {
            return NextResponse.json(
                { error: 'Файл и категория обязательны' },
                { status: 400 }
            );
        }

        console.log(`📁 Файл: ${file.name}`);
        console.log(`📂 Категория: ${categoryId}`);

        // Читаем Excel файл
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length === 0) {
            return NextResponse.json(
                { error: 'Файл пустой или не содержит данных' },
                { status: 400 }
            );
        }

        // Первая строка - заголовки (они же поля шаблона)
        const headers = data[0] as string[];
        const rows = data.slice(1) as any[][];

        console.log(`📋 Заголовки (${headers.length}):`);
        headers.forEach((header, index) => {
            console.log(`   ${index + 1}. "${header}"`);
        });

        console.log(`📊 Строк данных: ${rows.length}`);

        // Получаем категорию
        const category = await prisma.catalogCategory.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return NextResponse.json(
                { error: 'Категория не найдена' },
                { status: 404 }
            );
        }

        console.log(`✅ Категория найдена: ${category.name}`);

        // Обрабатываем товары
        const products = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            if (row.length === 0 || row.every(cell => !cell)) {
                console.log(`⏭️ Пропускаем пустую строку ${i + 2}`);
                continue;
            }

            console.log(`\n📦 Обрабатываем строку ${i + 2}:`);
            console.log(`   Данные: ${row.slice(0, 5).join(', ')}...`);

            try {
                // Создаем товар
                const product = {
                    sku: '',
                    name: '',
                    catalog_category_id: categoryId,
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
                        console.log(`   ${header}: ${row[headerIndex]}`);
                    }
                });

                // Извлекаем основные поля
                // SKU - обычно в колонке C (индекс 2)
                if (row[2]) {
                    product.sku = row[2].toString().trim();
                } else {
                    product.sku = `AUTO-${i + 1}`;
                }

                // Название - обычно в колонке D (индекс 3)
                if (row[3]) {
                    product.name = row[3].toString().trim();
                } else {
                    product.name = 'Без названия';
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
                            console.log(`   💰 Цена найдена: ${price} руб.`);
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
                console.log(`   ✅ Товар добавлен: ${product.name} (${product.sku})`);

            } catch (error) {
                console.error(`   ❌ Ошибка обработки строки ${i + 2}:`, error);
                errors.push(`Строка ${i + 2}: Ошибка обработки - ${error.message}`);
            }
        }

        console.log(`\n📊 РЕЗУЛЬТАТЫ ОБРАБОТКИ:`);
        console.log(`   Товаров обработано: ${products.length}`);
        console.log(`   Ошибок: ${errors.length}`);

        // Сохраняем товары в базу данных
        let savedCount = 0;
        const savedProducts = [];

        for (const product of products) {
            try {
                // Проверяем, не существует ли уже товар с таким SKU
                const existingProduct = await prisma.product.findUnique({
                    where: { sku: product.sku }
                });

                if (existingProduct) {
                    console.log(`⚠️ Товар с SKU ${product.sku} уже существует, обновляем`);
                    
                    const updatedProduct = await prisma.product.update({
                        where: { sku: product.sku },
                        data: {
                            name: product.name,
                            properties_data: JSON.stringify(product.properties_data),
                            base_price: product.base_price,
                            updated_at: new Date()
                        }
                    });
                    
                    savedProducts.push(updatedProduct);
                } else {
                    console.log(`➕ Создаем новый товар: ${product.name}`);
                    
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
                    
                    savedProducts.push(newProduct);
                }
                
                savedCount++;
                
            } catch (error) {
                console.error(`❌ Ошибка сохранения товара ${product.name}:`, error);
                errors.push(`Товар "${product.name}": Ошибка сохранения - ${error.message}`);
            }
        }

        // Обновляем счетчик товаров в категории
        const categoryProductsCount = await prisma.product.count({
            where: { 
                catalog_category_id: categoryId,
                is_active: true 
            }
        });

        await prisma.catalogCategory.update({
            where: { id: categoryId },
            data: { 
                products_count: categoryProductsCount,
                updated_at: new Date()
            }
        });

        console.log(`\n🎉 ИМПОРТ ЗАВЕРШЕН:`);
        console.log(`   Сохранено товаров: ${savedCount}`);
        console.log(`   Всего товаров в категории: ${categoryProductsCount}`);
        console.log(`   Ошибок: ${errors.length}`);

        // Создаем запись в истории импорта
        await prisma.importHistory.create({
            data: {
                catalog_category_id: categoryId,
                filename: file.name,
                file_size: file.size,
                imported_count: savedCount,
                error_count: errors.length,
                status: errors.length > 0 ? 'partial' : 'completed',
                errors: JSON.stringify(errors),
                import_data: JSON.stringify({
                    headers: headers,
                    total_rows: rows.length,
                    processed_rows: products.length,
                    saved_rows: savedCount
                })
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Импорт завершен успешно',
            data: {
                filename: file.name,
                category: category.name,
                headers: headers,
                total_rows: rows.length,
                processed_rows: products.length,
                saved_rows: savedCount,
                errors: errors,
                products_preview: savedProducts.slice(0, 5).map(p => ({
                    id: p.id,
                    sku: p.sku,
                    name: p.name,
                    base_price: p.base_price
                }))
            }
        });

    } catch (error) {
        console.error('❌ Критическая ошибка импорта:', error);
        return NextResponse.json(
            { 
                error: 'Ошибка при импорте файла',
                details: error.message 
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

// GET - информация об упрощенном импорте
export async function GET(req: NextRequest) {
    return NextResponse.json({
        ok: true,
        message: "Упрощенный API импорта без маппинга",
        description: "Заголовки Excel = Поля шаблона (прямое соответствие)",
        usage: "POST запрос с FormData: file, category",
        features: [
            "Прямое соответствие заголовков Excel и полей шаблона",
            "Нет промежуточного маппинга",
            "Автоматическое определение цены",
            "Автоматическая генерация SKU",
            "Обновление существующих товаров",
            "Подсчет товаров в категории"
        ],
        example: {
            method: "POST",
            body: "FormData с полями: file (Excel файл), category (ID категории)"
        }
    });
}
