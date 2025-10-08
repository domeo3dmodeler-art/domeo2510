import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Агрессивное кэширование
const completeDataCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 час

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');

    const cacheKey = style || 'all';
    
    // Проверяем кэш
    const cached = completeDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ API complete-data - используем кэш');
      return NextResponse.json({
        ok: true,
        ...cached.data,
        cached: true
      });
    }

    console.log('🔍 API complete-data - загрузка всех данных для стиля:', style || 'все');

    // Один оптимизированный запрос к БД - загружаем только нужные поля
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: "Межкомнатные двери"
        },
        is_active: true
      },
      select: {
        properties_data: true
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5000 // Ограничиваем количество для производительности
    });

    console.log(`📦 Загружено ${products.length} товаров из БД`);

    // Фильтруем по стилю в памяти (если указан)
    const filteredProducts = style ? 
      products.filter(product => {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
        return properties['Domeo_Стиль Web'] === style;
      }) : 
      products;

    console.log(`🔍 После фильтрации по стилю "${style || 'все'}": ${filteredProducts.length} товаров`);

    // Обрабатываем данные в памяти
    const modelMap = new Map<string, { 
      model: string, 
      style: string, 
      photo: string | null,
      options: any
    }>();

    const photoMap = new Map<string, string[]>(); // артикул -> фото[]

    filteredProducts.forEach(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      const model = properties['Domeo_Название модели для Web'];
      const productStyle = properties['Domeo_Стиль Web'];
      const productArticle = properties['Артикул поставщика'];
      const productPhotos = properties.photos || [];

      if (model && productStyle) {
        // Собираем фото по артикулам
        if (productArticle && productPhotos.length > 0) {
          if (!photoMap.has(productArticle)) {
            photoMap.set(productArticle, []);
          }
          photoMap.get(productArticle)!.push(...productPhotos);
        }

        // Собираем модели
        if (!modelMap.has(model)) {
          modelMap.set(model, {
            model,
            style: productStyle,
            photo: null, // Будет заполнено ниже
            options: {
              finishes: new Set(),
              colors: new Set(),
              types: new Set(),
              widths: new Set(),
              heights: new Set()
            }
          });
        }

        const modelData = modelMap.get(model)!;
        
        // Собираем опции
        if (properties['Domeo_Покрытие Web']) modelData.options.finishes.add(properties['Domeo_Покрытие Web']);
        if (properties['Domeo_Цвет Web']) modelData.options.colors.add(properties['Domeo_Цвет Web']);
        if (properties['Domeo_Тип Web']) modelData.options.types.add(properties['Domeo_Тип Web']);
        if (properties['Domeo_Ширина Web']) modelData.options.widths.add(properties['Domeo_Ширина Web']);
        if (properties['Domeo_Высота Web']) modelData.options.heights.add(properties['Domeo_Высота Web']);
      }
    });

    // Привязываем фото к моделям
    const models = Array.from(modelMap.values()).map(modelData => {
      // Ищем фото для этой модели
      const modelProducts = filteredProducts.filter(p => {
        const props = p.properties_data ? 
          (typeof p.properties_data === 'string' ? JSON.parse(p.properties_data) : p.properties_data) : {};
        return props['Domeo_Название модели для Web'] === modelData.model;
      });

      let photo = null;
      for (const product of modelProducts) {
        const props = product.properties_data ? 
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
        const article = props['Артикул поставщика'];
        if (article && photoMap.has(article)) {
          photo = photoMap.get(article)![0]; // Берем первое фото
          break;
        }
      }

      return {
        ...modelData,
        photo,
        options: {
          finishes: Array.from(modelData.options.finishes),
          colors: Array.from(modelData.options.colors),
          types: Array.from(modelData.options.types),
          widths: Array.from(modelData.options.widths),
          heights: Array.from(modelData.options.heights)
        }
      };
    }).sort((a, b) => a.model.localeCompare(b.model));

    const result = {
      models,
      totalModels: models.length,
      styles: Array.from(new Set(models.map(m => m.style))),
      timestamp: Date.now()
    };

    // Сохраняем в кэш для конкретного стиля
    completeDataCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Если это запрос всех данных, сохраняем также для каждого стиля
    if (!style) {
      const allModels = models;
      const styles = Array.from(new Set(allModels.map(m => m.style)));
      
      styles.forEach(styleName => {
        const styleModels = allModels.filter(m => m.style === styleName);
        completeDataCache.set(styleName, {
          data: {
            models: styleModels,
            totalModels: styleModels.length,
            styles: [styleName],
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });
      });
    }

    console.log(`✅ API complete-data - найдено ${models.length} моделей с данными для стиля ${style || 'все'}`);

    return NextResponse.json({
      ok: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Ошибка API complete-data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complete data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
