import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/check-supplier-skus - Проверка артикулов поставщика по моделям
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    console.log('=== ПРОВЕРКА АРТИКУЛОВ ПОСТАВЩИКА ===');
    console.log('Категория:', categoryId);

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: 'Не указана категория' },
        { status: 400 }
      );
    }

    // Получаем все товары из категории
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: categoryId
      },
      select: {
        id: true,
        sku: true,
        name: true,
        model: true,
        properties_data: true
      }
    });

    console.log(`Найдено ${products.length} товаров в категории ${categoryId}`);

    // Группируем товары по моделям
    const modelGroups: Record<string, any[]> = {};
    
    products.forEach(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const model = product.model || 'Без модели';
        
        if (!modelGroups[model]) {
          modelGroups[model] = [];
        }
        
        modelGroups[model].push({
          id: product.id,
          sku: product.sku,
          name: product.name,
          model: product.model,
          properties: properties
        });
      } catch (error) {
        console.error(`Ошибка парсинга свойств товара ${product.sku}:`, error);
      }
    });

    console.log(`Найдено ${Object.keys(modelGroups).length} уникальных моделей`);

    // Проверяем артикулы поставщика для каждой модели
    const modelAnalysis = [];
    const possibleSupplierKeys = [
      'Артикул поставщика',
      'Артикул',
      'SKU',
      'sku',
      'Артикул_поставщика',
      'Supplier SKU',
      'Supplier_sku'
    ];

    for (const [modelName, modelProducts] of Object.entries(modelGroups)) {
      console.log(`\n=== АНАЛИЗ МОДЕЛИ: ${modelName} ===`);
      console.log(`Товаров в модели: ${modelProducts.length}`);

      // Собираем все уникальные артикулы поставщика для этой модели
      const supplierSkus = new Set<string>();
      const supplierSkuDetails: Record<string, any[]> = {};

      modelProducts.forEach(product => {
        // Ищем артикул поставщика в свойствах
        let foundSupplierSku = null;
        let foundKey = null;

        for (const key of possibleSupplierKeys) {
          const value = product.properties[key];
          if (value && value.toString().trim()) {
            foundSupplierSku = value.toString().trim();
            foundKey = key;
            break;
          }
        }

        // Также ищем по всем ключам, которые содержат "артикул" или "sku"
        if (!foundSupplierSku) {
          Object.keys(product.properties).forEach(key => {
            if (key.toLowerCase().includes('артикул') || 
                key.toLowerCase().includes('sku') ||
                key.toLowerCase().includes('supplier')) {
              const value = product.properties[key];
              if (value && value.toString().trim()) {
                foundSupplierSku = value.toString().trim();
                foundKey = key;
              }
            }
          });
        }

        if (foundSupplierSku) {
          supplierSkus.add(foundSupplierSku);
          
          if (!supplierSkuDetails[foundSupplierSku]) {
            supplierSkuDetails[foundSupplierSku] = [];
          }
          
          supplierSkuDetails[foundSupplierSku].push({
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            foundKey: foundKey
          });
        } else {
          console.log(`❌ Товар ${product.sku} не имеет артикула поставщика`);
        }
      });

      const uniqueSupplierSkus = Array.from(supplierSkus);
      const isConsistent = uniqueSupplierSkus.length === 1;
      
      console.log(`Уникальных артикулов поставщика: ${uniqueSupplierSkus.length}`);
      console.log(`Артикулы: ${uniqueSupplierSkus.join(', ')}`);
      console.log(`Консистентность: ${isConsistent ? '✅ ДА' : '❌ НЕТ'}`);

      modelAnalysis.push({
        model: modelName,
        totalProducts: modelProducts.length,
        uniqueSupplierSkus: uniqueSupplierSkus.length,
        supplierSkus: uniqueSupplierSkus,
        isConsistent: isConsistent,
        details: supplierSkuDetails,
        issues: isConsistent ? [] : [
          `Модель "${modelName}" имеет ${uniqueSupplierSkus.length} разных артикулов поставщика: ${uniqueSupplierSkus.join(', ')}`
        ]
      });
    }

    // Общая статистика
    const totalModels = modelAnalysis.length;
    const consistentModels = modelAnalysis.filter(m => m.isConsistent).length;
    const inconsistentModels = modelAnalysis.filter(m => !m.isConsistent);

    console.log(`\n=== ОБЩАЯ СТАТИСТИКА ===`);
    console.log(`Всего моделей: ${totalModels}`);
    console.log(`Консистентных моделей: ${consistentModels}`);
    console.log(`Неконсистентных моделей: ${inconsistentModels.length}`);

    const result = {
      success: true,
      categoryId: categoryId,
      totalProducts: products.length,
      totalModels: totalModels,
      consistentModels: consistentModels,
      inconsistentModels: inconsistentModels.length,
      models: modelAnalysis,
      summary: {
        allModelsConsistent: inconsistentModels.length === 0,
        issues: inconsistentModels.map(m => m.issues).flat()
      }
    };

    console.log('=== РЕЗУЛЬТАТ ПРОВЕРКИ ===');
    console.log(result.summary);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Ошибка при проверке артикулов поставщика:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при проверке артикулов поставщика' },
      { status: 500 }
    );
  }
}
