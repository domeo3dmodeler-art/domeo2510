import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // Простой GET endpoint для тестирования
    const products = await prisma.product.findMany({
      where: {
        is_active: true,
        catalog_category: {
          name: 'Межкомнатные двери'
        }
      },
      select: {
        properties_data: true
      },
      take: 100 // Ограничиваем для производительности
    });

    const availableParams = {
      finishes: new Set<string>(),
      colors: new Set<string>(),
      widths: new Set<number>(),
      heights: new Set<number>()
    };

    products.forEach(product => {
      const props = product.properties_data ? 
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
      
      if (props?.['Тип покрытия']) {
        availableParams.finishes.add(props['Тип покрытия']);
      }
      if (props?.['Domeo_Цвет']) {
        availableParams.colors.add(props['Domeo_Цвет']);
      }
      if (props?.['Ширина/мм']) {
        availableParams.widths.add(Number(props['Ширина/мм']));
      }
      if (props?.['Высота/мм']) {
        availableParams.heights.add(Number(props['Высота/мм']));
      }
    });

    return NextResponse.json({
      success: true,
      params: {
        finishes: Array.from(availableParams.finishes).sort(),
        colors: Array.from(availableParams.colors).sort(),
        widths: Array.from(availableParams.widths).sort((a, b) => a - b),
        heights: Array.from(availableParams.heights).sort((a, b) => a - b)
      }
    });
  } catch (error) {
    console.error('❌ Error in GET /api/available-params:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available parameters', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  console.log('🔍 POST /api/available-params called');
  try {
    const body = await req.json();
    console.log('📥 Request body:', body);
    console.log('📥 Raw style:', JSON.stringify(body.style));
    console.log('📥 Raw model:', JSON.stringify(body.model));
    const { style, model, color } = body;
    
    if (!style || !model) {
      console.log('❌ Missing style or model:', { style, model });
      return NextResponse.json(
        { error: 'Style and model are required' },
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          }
        }
      );
    }

    // Получаем все товары и фильтруем на клиенте
    const products = await prisma.product.findMany({
      where: {
        is_active: true
      },
      select: {
        properties_data: true
      }
    });

    console.log('📦 Total products loaded:', products.length);

    // Фильтруем по стилю, модели и цвету (если указан) на клиенте
    const filteredProducts = products.filter(product => {
      try {
        const props = product.properties_data ? 
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
        const styleMatch = props?.['Domeo_Стиль Web'] === style;
        const modelMatch = props?.['Domeo_Название модели для Web']?.includes(model);
        const colorMatch = !color || props?.['Domeo_Цвет'] === color; // Если цвет не указан, пропускаем проверку
        
        // Логируем только первые несколько товаров для отладки
        if (Math.random() < 0.01) { // 1% вероятность логирования
          console.log('🔍 Product check:', {
            style: props?.['Domeo_Стиль Web'],
            model: props?.['Domeo_Название модели для Web'],
            color: props?.['Domeo_Цвет'],
            styleMatch,
            modelMatch,
            colorMatch,
            requestedStyle: style,
            requestedModel: model,
            requestedColor: color
          });
        }
        return styleMatch && modelMatch && colorMatch;
      } catch (error) {
        console.error('❌ Error parsing product properties:', error);
        return false;
      }
    });

    console.log('📦 Filtered products:', filteredProducts.length);

    if (filteredProducts.length === 0) {
      console.log('❌ No products found for style:', style, 'model:', model);
      return NextResponse.json({ error: 'No products found' }, { 
        status: 404,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }

    // Извлекаем уникальные значения для каждого параметра
    const availableParams = {
      finishes: new Set<string>(),
      colors: new Set<string>(),
      widths: new Set<number>(),
      heights: new Set<number>(),
      hardwareKits: new Set<string>()
    };

    filteredProducts.forEach(product => {
      const props = product.properties_data ? 
        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
      
      if (props?.['Тип покрытия']) {
        availableParams.finishes.add(props['Тип покрытия']);
      }
      if (props?.['Domeo_Цвет']) {
        availableParams.colors.add(props['Domeo_Цвет']);
      }
      if (props?.['Ширина/мм']) {
        availableParams.widths.add(Number(props['Ширина/мм']));
      }
      if (props?.['Высота/мм']) {
        availableParams.heights.add(Number(props['Высота/мм']));
      }
    });

    // Получаем доступные комплекты фурнитуры
    const hardwareKits = await prisma.product.findMany({
      where: {
        is_active: true,
        catalog_category: {
          name: 'Комплекты фурнитуры'
        }
      },
      select: {
        id: true,
        name: true,
        properties_data: true
      }
    });

    console.log('🔧 Hardware kits found:', hardwareKits.length);
    console.log('🔧 First few kits:', hardwareKits.slice(0, 3).map(kit => ({
      id: kit.id,
      name: kit.name,
      props: kit.properties_data ? (typeof kit.properties_data === 'string' ? JSON.parse(kit.properties_data) : kit.properties_data) : {}
    })));

    const hardwareKitOptions: Array<{id: string, name: string}> = [];
    hardwareKits.forEach(kit => {
      const props = kit.properties_data ? 
        (typeof kit.properties_data === 'string' ? JSON.parse(kit.properties_data) : kit.properties_data) : {};
      
      // Попробуем разные поля для названия группы
      const groupName = props?.['Группа'] || props?.['Ценовая группа'] || props?.['Наименование для Web'] || kit.name;
      
      if (groupName) {
        hardwareKitOptions.push({
          id: kit.id,
          name: groupName
        });
      }
    });

    console.log('🔧 Hardware kit options:', hardwareKitOptions.length, hardwareKitOptions);

    // Получаем доступные ручки
    const handles = await prisma.product.findMany({
      where: {
        is_active: true,
        catalog_category: {
          name: 'Ручки'
        }
      },
      select: {
        id: true,
        name: true,
        properties_data: true
      }
    });

    const handleOptions: Array<{id: string, name: string, group: string}> = [];
    handles.forEach(handle => {
      const props = handle.properties_data ? 
        (typeof handle.properties_data === 'string' ? JSON.parse(handle.properties_data) : handle.properties_data) : {};
      if (props?.['Domeo_наименование ручки_1С'] || props?.['Domeo_наименование для Web']) {
        handleOptions.push({
          id: handle.id,
          name: props['Domeo_наименование ручки_1С'] || props['Domeo_наименование для Web'] || handle.name,
          group: props['Группа'] || 'Без группы'
        });
      }
    });

    console.log('✅ Available params:', {
      finishes: Array.from(availableParams.finishes).length,
      colors: Array.from(availableParams.colors).length,
      widths: Array.from(availableParams.widths).length,
      heights: Array.from(availableParams.heights).length,
      hardwareKits: hardwareKitOptions.length,
      handles: handleOptions.length
    });

    return NextResponse.json({
      success: true,
      params: {
        finishes: Array.from(availableParams.finishes).sort(),
        colors: Array.from(availableParams.colors).sort(),
        widths: Array.from(availableParams.widths).sort((a, b) => a - b),
        heights: Array.from(availableParams.heights).sort((a, b) => a - b),
        hardwareKits: hardwareKitOptions,
        handles: handleOptions
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching available parameters:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch available parameters', details: error.message },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      }
    );
  }
}
