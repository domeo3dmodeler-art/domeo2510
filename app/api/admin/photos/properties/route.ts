import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/admin/photos/properties - Получить доступные свойства для загрузки фото
 * Параметры:
 * - category: ID категории
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json(
        { success: false, message: 'Не указана категория' },
        { status: 400 }
      );
    }

    // Получаем несколько товаров из категории для анализа свойств
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: category
      },
      select: {
        properties_data: true
      },
      take: 10 // Берем первые 10 товаров для анализа
    });

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        properties: [],
        message: 'Товары в категории не найдены'
      });
    }

    // Собираем все уникальные свойства
    const allProperties = new Set<string>();
    products.forEach(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        Object.keys(properties).forEach(key => {
          allProperties.add(key);
        });
      } catch (error) {
        console.warn('Ошибка парсинга свойств товара:', error);
      }
    });

    // Определяем рекомендуемые свойства для фото в зависимости от категории
    const recommendedProperties: string[] = [];
    const categoryName = await prisma.catalog_category.findUnique({
      where: { id: category },
      select: { name: true }
    });

    if (categoryName?.name?.toLowerCase().includes('двер')) {
      // Для дверей рекомендуем свойства модели
      recommendedProperties.push(
        'Domeo_Название модели для Web',
        'Domeo_Стиль Web',
        'Цвет',
        'Отделка',
        'Материал'
      );
    } else {
      // Для других категорий - общие свойства
      recommendedProperties.push(
        'Название',
        'Модель',
        'Цвет',
        'Материал',
        'Тип'
      );
    }

    // Фильтруем только существующие свойства
    const availableRecommended = recommendedProperties.filter(prop => 
      allProperties.has(prop)
    );

    // Добавляем остальные свойства
    const otherProperties = Array.from(allProperties)
      .filter(prop => !recommendedProperties.includes(prop))
      .sort();

    const result = {
      success: true,
      category: categoryName?.name || 'Неизвестная категория',
      properties: {
        recommended: availableRecommended,
        other: otherProperties,
        all: Array.from(allProperties).sort()
      },
      total: allProperties.size
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Ошибка получения свойств для фото:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка сервера при получении свойств' },
      { status: 500 }
    );
  }
}
