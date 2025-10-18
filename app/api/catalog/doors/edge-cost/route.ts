import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');
    const model = searchParams.get('model');
    const finish = searchParams.get('finish');
    const color = searchParams.get('color');
    const type = searchParams.get('type');
    const width = searchParams.get('width');
    const height = searchParams.get('height');

    console.log('🔍 Получение стоимости кромки:', { style, model, finish, color, type, width, height });

    // Получаем все товары категории двери
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: "Межкомнатные двери"
        }
      },
      select: {
        properties_data: true
      }
    });

    // Фильтруем товары по выбранным параметрам
    const filteredProducts = products.filter(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      // Применяем фильтры по порядку
      if (style && properties['Domeo_Стиль Web'] !== style) return false;
      if (model && !properties['Domeo_Название модели для Web']?.includes(model)) return false;
      if (finish && properties['Общее_Тип покрытия'] !== finish) return false;
      if (color && properties['Domeo_Цвет'] !== color) return false;
      if (type && properties['Тип конструкции'] !== type) return false;
      if (width && properties['Ширина/мм'] !== width) return false;
      if (height && properties['Высота/мм'] !== height) return false;

      return true;
    });

    console.log(`📦 Отфильтровано товаров: ${filteredProducts.length} из ${products.length}`);

    // Анализируем кромку и стоимость
    const costValues = new Set<string>();
    let sampleProduct = null;
    let hasNoEdgeWithoutCost = 0;  // Кромка "нет" без стоимости
    let hasNoEdgeWithCost = 0;     // Кромка "нет" со стоимостью
    let hasSpecificEdgeProducts = 0;

    filteredProducts.forEach(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      const edgeValue = properties['Кромка'];
      const costValue = properties['Стоимость надбавки за кромку'];
      
      if (!edgeValue || edgeValue === '-' || edgeValue === '' || 
          edgeValue.toLowerCase() === 'нет' || edgeValue.toLowerCase() === 'no') {
        // Проверяем наличие стоимости надбавки
        if (costValue && costValue !== '-' && costValue !== '' && costValue !== null) {
          hasNoEdgeWithCost++;
          costValues.add(costValue);
          if (!sampleProduct) {
            sampleProduct = {
              cost: costValue,
              edge: edgeValue,
              style: properties['Domeo_Стиль Web'],
              model: properties['Domeo_Название модели для Web'],
              finish: properties['Общее_Тип покрытия'],
              color: properties['Domeo_Цвет']
            };
          }
        } else {
          hasNoEdgeWithoutCost++;
        }
      } else {
        hasSpecificEdgeProducts++;
      }
    });

    const responseData = {
      ok: true,
      filteredCount: filteredProducts.length,
      costValues: Array.from(costValues).sort(),
      sampleProduct,
      hasCost: costValues.size > 0,
      hasNoEdgeWithoutCost,
      hasNoEdgeWithCost,
      hasSpecificEdgeProducts,
      isEdgeUnavailable: hasNoEdgeWithoutCost > 0 && hasNoEdgeWithCost === 0 && hasSpecificEdgeProducts === 0
    };

    console.log('✅ Стоимость кромки:', responseData);

    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Error in edge cost:', error);
    return NextResponse.json(
      { error: "Ошибка получения стоимости кромки" },
      { status: 500 }
    );
  }
}
