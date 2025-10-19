import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Кэш для опций дверей
const optionsCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 минут

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

    // Временно отключаем кэш для отладки
    // const cacheKey = `options_${style || 'all'}_${model || 'all'}_${finish || 'all'}_${color || 'all'}_${type || 'all'}_${width || 'all'}_${height || 'all'}`;
    // const cached = optionsCache.get(cacheKey);
    // if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    //   return NextResponse.json({
    //     ...cached.data,
    //     cached: true
    //   });
    // }

    console.log('🔍 API options - загрузка данных (не из кэша)');

    // Получаем только нужные поля для оптимизации
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

    // Извлекаем уникальные значения из properties_data
    const distinctStyles = new Set<string>();
    const distinctModels = new Set<string>();
    const distinctFinishes = new Set<string>();
    const distinctColors = new Set<string>();
    const distinctTypes = new Set<string>();
    const distinctWidths = new Set<number>();
    const distinctHeights = new Set<number>();

    products.forEach(product => {
      const properties = product.properties_data ?
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

      // Фильтруем по стилю и модели если они указаны
      if (style && properties['Domeo_Стиль Web'] !== style) return;
      if (model && !properties['Domeo_Название модели для Web']?.includes(model)) return;

      // Извлекаем данные из properties_data согласно реальной структуре
      if (properties['Domeo_Стиль Web']) distinctStyles.add(properties['Domeo_Стиль Web']);
      if (properties['Domeo_Название модели для Web']) distinctModels.add(properties['Domeo_Название модели для Web']);
      if (properties['Тип покрытия']) distinctFinishes.add(properties['Тип покрытия']);
      if (properties['Domeo_Цвет']) distinctColors.add(properties['Domeo_Цвет']);
      if (properties['Тип конструкции']) distinctTypes.add(properties['Тип конструкции']);
      if (properties['Ширина/мм']) distinctWidths.add(Number(properties['Ширина/мм']));
      if (properties['Высота/мм']) distinctHeights.add(Number(properties['Высота/мм']));
    });

    // Статические данные для комплектов и ручек
    const kits = [
      { id: "KIT_STD", name: "Базовый комплект", group: 1, price_rrc: 5000 },
      { id: "KIT_SOFT", name: "SoftClose", group: 2, price_rrc: 2400 },
    ];

    const handles = [
      {
        id: "HNDL_PRO",
        name: "Pro",
        supplier_name: "HandleCo",
        supplier_sku: "H-PRO",
        price_opt: 900,
        price_rrc: 1200,
        price_group_multiplier: 1.15,
      },
      {
        id: "HNDL_SIL",
        name: "Silver",
        supplier_name: "HandleCo",
        supplier_sku: "H-SIL",
        price_opt: 1100,
        price_rrc: 1400,
        price_group_multiplier: 1.15,
      },
    ];

    const responseData = {
      ok: true,
      domain: {
        style: Array.from(distinctStyles).sort(),
        model: Array.from(distinctModels).sort(),
        finish: Array.from(distinctFinishes).sort(),
        color: Array.from(distinctColors).sort(),
        type: Array.from(distinctTypes).sort(),
        width: Array.from(distinctWidths).sort((a, b) => a - b),
        height: Array.from(distinctHeights).sort((a, b) => a - b),
        kits,
        handles
      },
      cached: false
    };

    // Временно отключаем сохранение в кэш
    // optionsCache.set(cacheKey, {
    //   data: responseData,
    //   timestamp: Date.now()
    // });

    console.log('✅ API options - данные загружены и сохранены в кэш');

    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('Error fetching door options:', error);
    return NextResponse.json(
      { error: "Ошибка получения опций" },
      { status: 500 }
    );
  }
}