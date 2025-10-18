import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const model = searchParams.get('model');

    if (!model) {
      return NextResponse.json(
        { error: "Не указана модель" },
        { status: 400 }
      );
    }

    console.log('🔍 API photos-simple - поиск фотографий для модели:', model);

    // Простой запрос к БД
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: "Межкомнатные двери"
        },
        is_active: true
      },
      select: {
        id: true,
        sku: true,
        properties_data: true
      },
      take: 100 // Ограничиваем для производительности
    });

    console.log(`📦 Загружено ${products.length} товаров из БД`);

    // Ищем фотографии для модели
    const photos: string[] = [];

    for (const product of products) {
      try {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

        const productModel = properties['Domeo_Название модели для Web'];
        const productPhotos = properties.photos || [];

        // Точное совпадение модели
        if (productModel === model && productPhotos.length > 0) {
          console.log(`✅ Найдена модель ${model} с ${productPhotos.length} фотографиями`);
          photos.push(...productPhotos);
          break; // Берем первое найденное фото
        }
      } catch (error) {
        console.warn(`Ошибка обработки товара ${product.sku}:`, error);
      }
    }

    // Если не найдено точное совпадение, ищем частичное
    if (photos.length === 0) {
      for (const product of products) {
        try {
          const properties = product.properties_data ?
            (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

          const productModel = properties['Domeo_Название модели для Web'];
          const productPhotos = properties.photos || [];

          // Частичное совпадение
          if (productModel && productModel.includes(model) && productPhotos.length > 0) {
            console.log(`✅ Найдена модель ${model} (частичное совпадение) с ${productPhotos.length} фотографиями`);
            photos.push(...productPhotos);
            break;
          }
        } catch (error) {
          console.warn(`Ошибка обработки товара ${product.sku}:`, error);
        }
      }
    }

    // Если фото не найдены, добавляем заглушки для известных моделей
    if (photos.length === 0) {
      if (model.includes('Moonstone')) {
        const moonstoneNumber = model.match(/\d+/)?.[0] || '1';
        photos.push(`/uploads/products/moonstone/moonstone_${moonstoneNumber}.png`);
        console.log(`🖼️ Добавлена заглушка для ${model}: /uploads/products/moonstone/moonstone_${moonstoneNumber}.png`);
      } else if (model.includes('Ledoux')) {
        const ledouxNumber = model.match(/\d+/)?.[0] || '2';
        photos.push(`/uploads/products/ledoux/ledoux_${ledouxNumber}.png`);
        console.log(`🖼️ Добавлена заглушка для ${model}: /uploads/products/ledoux/ledoux_${ledouxNumber}.png`);
      }
    }

    return NextResponse.json({
      ok: true,
      model,
      photos,
      count: photos.length,
      cached: false
    });

  } catch (error) {
    console.error('❌ API photos-simple - ОШИБКА:', error);
    return NextResponse.json(
      { error: "Ошибка получения фотографий", details: (error as Error).message },
      { status: 500 }
    );
  }
}
