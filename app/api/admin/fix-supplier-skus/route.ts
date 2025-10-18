import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/admin/fix-supplier-skus - Исправление артикулов поставщика для моделей
export async function POST(request: NextRequest) {
  try {
    const { modelName, newSupplierSku, categoryId } = await request.json();

    console.log('=== ИСПРАВЛЕНИЕ АРТИКУЛОВ ПОСТАВЩИКА ===');
    console.log('Модель:', modelName);
    console.log('Новый артикул:', newSupplierSku);
    console.log('Категория:', categoryId);

    if (!modelName || !newSupplierSku || !categoryId) {
      return NextResponse.json(
        { success: false, message: 'Не указаны обязательные параметры: modelName, newSupplierSku, categoryId' },
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
        properties_data: true
      }
    });

    console.log(`Найдено ${products.length} товаров в категории ${categoryId}`);

    // Фильтруем товары по модели
    const modelProducts = products.filter(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        const domeoModel = properties['Domeo_Название модели для Web'];
        return domeoModel === modelName;
      } catch (error) {
        console.error(`Ошибка парсинга свойств товара ${product.sku}:`, error);
        return false;
      }
    });

    console.log(`Найдено ${modelProducts.length} товаров в модели "${modelName}"`);

    if (modelProducts.length === 0) {
      return NextResponse.json(
        { success: false, message: `Не найдено товаров в модели "${modelName}"` },
        { status: 404 }
      );
    }

    // Собираем информацию о старых артикулах
    const oldSupplierSkus = new Set<string>();
    const possibleSupplierKeys = [
      'Артикул поставщика',
      'Артикул',
      'SKU',
      'sku',
      'Артикул_поставщика',
      'Supplier SKU',
      'Supplier_sku'
    ];

    modelProducts.forEach(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        
        // Ищем артикул поставщика
        for (const key of possibleSupplierKeys) {
          const value = properties[key];
          if (value && value.toString().trim()) {
            oldSupplierSkus.add(value.toString().trim());
            break;
          }
        }

        // Также ищем по всем ключам, которые содержат "артикул" или "sku"
        if (oldSupplierSkus.size === 0) {
          Object.keys(properties).forEach(key => {
            if (key.toLowerCase().includes('артикул') || 
                key.toLowerCase().includes('sku') ||
                key.toLowerCase().includes('supplier')) {
              const value = properties[key];
              if (value && value.toString().trim()) {
                oldSupplierSkus.add(value.toString().trim());
              }
            }
          });
        }
      } catch (error) {
        console.error(`Ошибка анализа товара ${product.sku}:`, error);
      }
    });

    console.log(`Старые артикулы в модели "${modelName}":`, Array.from(oldSupplierSkus));

    // Обновляем артикулы поставщика для всех товаров модели
    let updatedProducts = 0;
    const updateErrors = [];

    for (const product of modelProducts) {
      try {
        const currentProperties = JSON.parse(product.properties_data || '{}');
        let foundKey = null;

        // Ищем существующий ключ артикула поставщика
        for (const key of possibleSupplierKeys) {
          if (currentProperties[key]) {
            foundKey = key;
            break;
          }
        }

        // Если не нашли стандартный ключ, ищем по содержимому
        if (!foundKey) {
          Object.keys(currentProperties).forEach(key => {
            if (key.toLowerCase().includes('артикул') || 
                key.toLowerCase().includes('sku') ||
                key.toLowerCase().includes('supplier')) {
              foundKey = key;
            }
          });
        }

        // Если ключ не найден, используем стандартный
        if (!foundKey) {
          foundKey = 'Артикул поставщика';
        }

        // Обновляем артикул
        currentProperties[foundKey] = newSupplierSku;

        // Сохраняем изменения
        await prisma.product.update({
          where: { id: product.id },
          data: {
            properties_data: JSON.stringify(currentProperties)
          }
        });

        updatedProducts++;
        console.log(`Обновлен товар ${product.sku}: артикул поставщика изменен на "${newSupplierSku}"`);

      } catch (error) {
        console.error(`Ошибка при обновлении товара ${product.sku}:`, error);
        updateErrors.push(`Товар ${product.sku}: ${error.message}`);
      }
    }

    const result = {
      success: true,
      message: `Успешно обновлено ${updatedProducts} товаров в модели "${modelName}"`,
      modelName: modelName,
      newSupplierSku: newSupplierSku,
      oldSupplierSkus: Array.from(oldSupplierSkus),
      updatedProducts: updatedProducts,
      totalProducts: modelProducts.length,
      errors: updateErrors
    };

    console.log('=== РЕЗУЛЬТАТ ИСПРАВЛЕНИЯ ===');
    console.log(result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Ошибка при исправлении артикулов поставщика:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при исправлении артикулов поставщика' },
      { status: 500 }
    );
  }
}
