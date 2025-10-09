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
    const edge = searchParams.get('edge');

    console.log('🔍 Каскадная фильтрация:', { style, model, finish, color, type, width, height, edge });

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
      
            // Фильтрация по кромке с новой логикой
            if (edge) {
              const edgeValue = properties['Кромка'];
              
              let hasMatchingEdge = false;
              
              if (edge === 'Нет') {
                // Если выбрано "Нет", то товар должен не иметь кромки или иметь значение "нет"
                hasMatchingEdge = !edgeValue || edgeValue === '-' || edgeValue === '' || 
                  edgeValue.toLowerCase() === 'нет' || edgeValue.toLowerCase() === 'no';
              } else if (edge === 'Да') {
                // Если выбрано "Да", то товар должен иметь кромку (любое значение кроме пустого/нет)
                hasMatchingEdge = edgeValue && edgeValue !== '-' && edgeValue !== '' && 
                  edgeValue.toLowerCase() !== 'нет' && edgeValue.toLowerCase() !== 'no';
              } else {
                // Если выбрано конкретное значение кромки, сравниваем с полем "Кромка"
                hasMatchingEdge = edgeValue === edge;
              }
              
              if (!hasMatchingEdge) return false;
            }

      return true;
    });

    console.log(`📦 Отфильтровано товаров: ${filteredProducts.length} из ${products.length}`);

    // Собираем доступные опции для следующего уровня
    const availableOptions = {
      finish: new Set<string>(),
      color: new Set<string>(),
      type: new Set<string>(),
      width: new Set<number>(),
      height: new Set<number>(),
      edge: new Set<string>()
    };

    // Анализируем кромку для определения логики
    let hasNoEdgeWithoutCost = 0;  // Кромка "нет" без стоимости
    let hasNoEdgeWithCost = 0;     // Кромка "нет" со стоимостью
    let hasSpecificEdgeProducts = 0;
    const specificEdgeValues = new Set<string>();

    filteredProducts.forEach(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      // Добавляем опции, которые еще не выбраны, ИЛИ уже выбраны (чтобы они отображались в селекте)
      if (properties['Общее_Тип покрытия']) availableOptions.finish.add(properties['Общее_Тип покрытия']);
      if (properties['Domeo_Цвет']) availableOptions.color.add(properties['Domeo_Цвет']);
      if (properties['Тип конструкции']) availableOptions.type.add(properties['Тип конструкции']);
      if (properties['Ширина/мм']) availableOptions.width.add(Number(properties['Ширина/мм']));
      if (properties['Высота/мм']) availableOptions.height.add(Number(properties['Высота/мм']));
      
      // Анализируем кромку
      const edgeValue = properties['Кромка'];
      const costValue = properties['Стоимость надбавки за кромку'];
      
      if (!edgeValue || edgeValue === '-' || edgeValue === '' || 
          edgeValue.toLowerCase() === 'нет' || edgeValue.toLowerCase() === 'no') {
        // Проверяем наличие стоимости надбавки
        if (costValue && costValue !== '-' && costValue !== '' && costValue !== null) {
          hasNoEdgeWithCost++;
        } else {
          hasNoEdgeWithoutCost++;
        }
      } else {
        hasSpecificEdgeProducts++;
        specificEdgeValues.add(edgeValue);
      }
    });

    // Определяем логику отображения кромки
    if (hasNoEdgeWithoutCost > 0 && hasNoEdgeWithCost === 0 && hasSpecificEdgeProducts === 0) {
      // Только товары без кромки и без стоимости - показываем "Не доступно для заказа"
      availableOptions.edge.add('Не доступно для заказа');
    } else if (hasNoEdgeWithCost > 0) {
      // Если есть товары со стоимостью кромки - показываем только Да/Нет
      availableOptions.edge.add('Нет');
      availableOptions.edge.add('Да');
    } else if (hasSpecificEdgeProducts > 0 && hasNoEdgeWithCost === 0 && hasNoEdgeWithoutCost === 0) {
      // Только товары с конкретной кромкой и без стоимости - показываем все значения
      specificEdgeValues.forEach(value => availableOptions.edge.add(value));
    } else {
      // Остальные случаи - показываем только "Нет"
      availableOptions.edge.add('Нет');
    }

    const responseData = {
      ok: true,
      filteredCount: filteredProducts.length,
      availableOptions: {
        finish: Array.from(availableOptions.finish).sort(),
        color: Array.from(availableOptions.color).sort(),
        type: Array.from(availableOptions.type).sort(),
        width: Array.from(availableOptions.width).sort((a, b) => a - b),
        height: Array.from(availableOptions.height).sort((a, b) => a - b),
        edge: Array.from(availableOptions.edge).sort()
      }
    };

    console.log('✅ Каскадные опции:', responseData.availableOptions);

    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Error in cascade filtering:', error);
    return NextResponse.json(
      { error: "Ошибка каскадной фильтрации" },
      { status: 500 }
    );
  }
}
