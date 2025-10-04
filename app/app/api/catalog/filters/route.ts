import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { categoryIds } = await request.json();

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'Category IDs are required' },
        { status: 400 }
      );
    }

    // Получаем все свойства товаров из указанных категорий
    const products = await prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        isActive: true
      },
      include: {
        properties: true
      }
    });

    // Агрегируем свойства для создания фильтров
    const propertiesMap = new Map();

    products.forEach(product => {
      product.properties.forEach(property => {
        if (!propertiesMap.has(property.name)) {
          propertiesMap.set(property.name, {
            name: property.name,
            type: property.type || 'select',
            values: new Map()
          });
        }

        const value = property.value || property.stringValue || property.numberValue;
        if (value !== null && value !== undefined) {
          const currentCount = propertiesMap.get(property.name).values.get(value) || 0;
          propertiesMap.get(property.name).values.set(value, currentCount + 1);
        }
      });
    });

    // Преобразуем в формат фильтров
    const filters = Array.from(propertiesMap.entries()).map(([name, data]) => {
      const options = Array.from(data.values.entries()).map(([value, count]) => ({
        value: String(value),
        label: String(value),
        count
      }));

      // Определяем тип фильтра
      let type = 'select';
      if (data.type === 'number' || data.type === 'decimal') {
        const numbers = options.map(opt => parseFloat(opt.value)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          type = 'range';
          return {
            id: name.toLowerCase().replace(/\s+/g, '_'),
            name: name,
            type: 'range',
            options: options,
            min: Math.min(...numbers),
            max: Math.max(...numbers),
            step: 1
          };
        }
      }

      // Проверяем, являются ли значения цветами
      const colorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (options.length <= 10 && options.every(opt => colorPattern.test(opt.value))) {
        type = 'color';
      }

      return {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name: name,
        type: type,
        options: options.slice(0, 20), // Ограничиваем количество опций
        multiple: type === 'select' && options.length > 5
      };
    });

    // Добавляем стандартные фильтры
    const standardFilters = [
      {
        id: 'price',
        name: 'Цена',
        type: 'range',
        options: [],
        min: 0,
        max: 100000,
        step: 100
      }
    ];

    const allFilters = [...standardFilters, ...filters];

    return NextResponse.json({
      success: true,
      filters: allFilters
    });

  } catch (error) {
    console.error('Error fetching filters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
