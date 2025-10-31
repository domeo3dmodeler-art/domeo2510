import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { apiErrorHandler } from '@/lib/api-error-handler';

const prisma = new PrismaClient();

// POST /api/admin/products/rename-property - Переименование значения свойства товара
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoryId, propertyName, oldValue, newValue } = body;

    // Валидация
    if (!categoryId || !propertyName || !oldValue || !newValue) {
      return NextResponse.json(
        { 
          error: 'Не указаны обязательные параметры',
          required: ['categoryId', 'propertyName', 'oldValue', 'newValue']
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Переименование свойства "${propertyName}": "${oldValue}" → "${newValue}" в категории ${categoryId}`);

    // Получаем все товары категории
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: categoryId
      },
      select: {
        id: true,
        sku: true,
        properties_data: true,
        specifications: true
      }
    });

    console.log(`📦 Найдено товаров: ${products.length}`);

    let updatedCount = 0;
    let errorCount = 0;

    // Обновляем каждый товар
    for (const product of products) {
      try {
        // Парсим properties_data
        const propertiesData = typeof product.properties_data === 'string'
          ? JSON.parse(product.properties_data)
          : product.properties_data;

        // Парсим specifications
        const specifications = typeof product.specifications === 'string'
          ? JSON.parse(product.specifications || '{}')
          : product.specifications;

        let hasChanges = false;

        // Обновляем свойство в properties_data (с учетом разных регистров)
        // Проверяем основное свойство
        if (propertiesData[propertyName]) {
          const currentValue = String(propertiesData[propertyName]);
          if (currentValue.toLowerCase() === oldValue.toLowerCase()) {
            propertiesData[propertyName] = newValue;
            hasChanges = true;
            console.log(`  ✅ Товар ${product.sku}: "${propertyName}" = "${currentValue}" → "${newValue}"`);
          }
        }

        // Проверяем также поле "Общее_Тип покрытия", если это свойство "Тип покрытия"
        const generalPropertyName = `Общее_${propertyName}`;
        if (propertiesData[generalPropertyName]) {
          const currentValue = String(propertiesData[generalPropertyName]);
          if (currentValue.toLowerCase() === oldValue.toLowerCase()) {
            propertiesData[generalPropertyName] = newValue;
            hasChanges = true;
            console.log(`  ✅ Товар ${product.sku}: "${generalPropertyName}" = "${currentValue}" → "${newValue}"`);
          }
        }

        // Обновляем свойство в specifications (с учетом разных регистров)
        if (specifications[propertyName]) {
          const currentValue = String(specifications[propertyName]);
          if (currentValue.toLowerCase() === oldValue.toLowerCase()) {
            specifications[propertyName] = newValue;
            hasChanges = true;
          }
        }

        // Проверяем также поле "Общее_Тип покрытия" в specifications
        if (specifications[generalPropertyName]) {
          const currentValue = String(specifications[generalPropertyName]);
          if (currentValue.toLowerCase() === oldValue.toLowerCase()) {
            specifications[generalPropertyName] = newValue;
            hasChanges = true;
          }
        }

        // Если были изменения, обновляем товар в БД
        if (hasChanges) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              properties_data: JSON.stringify(propertiesData),
              specifications: JSON.stringify(specifications),
              updated_at: new Date()
            }
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`❌ Ошибка обновления товара ${product.sku}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Обновлено товаров: ${updatedCount}, ошибок: ${errorCount}`);

    return NextResponse.json({
      success: true,
      message: `Свойство "${propertyName}" переименовано: "${oldValue}" → "${newValue}"`,
      stats: {
        totalProducts: products.length,
        updated: updatedCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('❌ Ошибка переименования свойства:', error);
    return apiErrorHandler.handle(error, 'rename-property');
  } finally {
    await prisma.$disconnect();
  }
}

