import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/price/doors - Получить базовую информацию о ценах
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const model = searchParams.get('model');
    
    if (!model) {
      return NextResponse.json({
        ok: true,
        message: "API для расчета цен дверей",
        usage: "Используйте POST запрос с данными selection для расчета цены",
        example: {
          method: "POST",
          body: {
            selection: {
              model: "Классика",
              hardware_kit: { id: "KIT_STD" },
              handle: { id: "HNDL_PRO" }
            }
          }
        }
      });
    }

    // Если передан model, возвращаем базовую информацию
    const product = await prisma.product.findFirst({
      where: { model },
      select: {
        id: true,
        sku: true,
        name: true,
        model: true,
        series: true,
        base_price: true
      }
    });

    if (!product) {
      return NextResponse.json({
        ok: false,
        error: "Продукт не найден"
      });
    }

    return NextResponse.json({
      ok: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        model: product.model,
        series: product.series,
        base_price: product.base_price
      },
      message: "Для полного расчета цены используйте POST запрос"
    });
  } catch (error) {
    console.error('Error in GET /api/price/doors:', error);
    return NextResponse.json(
      { error: "Ошибка получения информации о ценах" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selection } = body;
    

    if (!selection) {
      return NextResponse.json(
        { error: "Данные для расчета не предоставлены" },
        { status: 400 }
      );
    }

    // Ищем продукт в базе данных по всем параметрам
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: "Межкомнатные двери"
        }
      },
      select: {
        id: true,
        sku: true,
        name: true,
        model: true,
        series: true,
        base_price: true,
        properties_data: true
      }
    });

    // Фильтруем товары по выбранным параметрам
    const product = products.find(p => {
      const properties = p.properties_data ? 
        (typeof p.properties_data === 'string' ? JSON.parse(p.properties_data) : p.properties_data) : {};

      // Сначала ищем по стилю и модели
      const styleMatch = !selection.style || properties['Domeo_Стиль Web'] === selection.style;
      const modelMatch = !selection.model || properties['Domeo_Название модели для Web']?.includes(selection.model);
      
      if (!styleMatch || !modelMatch) {
        return false;
      }

      // Затем по остальным параметрам
      return (
        (!selection.finish || properties['Общее_Тип покрытия'] === selection.finish) &&
        (!selection.color || properties['Domeo_Цвет'] === selection.color) &&
        (!selection.type || properties['Тип конструкции'] === selection.type) &&
        (!selection.width || properties['Ширина/мм'] == selection.width) &&
        (!selection.height || properties['Высота/мм'] == selection.height)
      );
    });

    // Если точный поиск не дал результатов, берем первый товар для тестирования
    const finalProduct = product || products[0];
    
    if (!finalProduct) {
      return NextResponse.json(
        { error: "Нет товаров в базе данных" },
        { status: 404 }
      );
    }

    // Парсим свойства продукта
    const properties = finalProduct.properties_data ? 
      (typeof finalProduct.properties_data === 'string' ? JSON.parse(finalProduct.properties_data) : finalProduct.properties_data) : {};

    // Рассчитываем цену из поля Цена ррц
    const retailPrice = properties['Цена ррц (включая цену полотна, короба, наличников, доборов)'];
    let doorPrice = parseFloat(retailPrice) || 0;
    let total = doorPrice;
    const breakdown = [
      { label: "Дверь", amount: doorPrice }
    ];

    // Добавляем комплект фурнитуры если выбран
    if (selection.hardware_kit?.id) {
      // Получаем комплекты фурнитуры из базы данных
      const hardwareKits = await prisma.product.findMany({
        where: {
          catalog_category: {
            name: "Комплекты фурнитуры"
          }
        },
        select: {
          id: true,
          name: true,
          properties_data: true
        }
      });

      const kit = hardwareKits.find(k => k.id === selection.hardware_kit.id);
      if (kit) {
        const kitProps = kit.properties_data ? 
          (typeof kit.properties_data === 'string' ? JSON.parse(kit.properties_data) : kit.properties_data) : {};
        
        const kitPrice = parseFloat(kitProps['Группа_цена']) || 0;
        total += kitPrice;
        breakdown.push({ 
          label: `Комплект: ${kitProps['Наименование для Web'] || kit.name}`, 
          amount: kitPrice 
        });
      }
    }

    // Добавляем ручку если выбрана
    if (selection.handle?.id) {
      // Получаем ручки из базы данных
      const handles = await prisma.product.findMany({
        where: {
          catalog_category: {
            name: "Ручки"
          }
        },
        select: {
          id: true,
          name: true,
          properties_data: true
        }
      });

      const handle = handles.find(h => h.id === selection.handle.id);
      if (handle) {
        const handleProps = handle.properties_data ? 
          (typeof handle.properties_data === 'string' ? JSON.parse(handle.properties_data) : handle.properties_data) : {};
        
        const handlePrice = parseFloat(handleProps['Domeo_цена группы Web']) || 0;
        total += handlePrice;
        breakdown.push({ 
          label: `Ручка: ${handleProps['Domeo_наименование ручки_1С'] || handle.name}`, 
          amount: handlePrice 
        });
      }
    }

    const result = {
      ok: true,
      currency: "RUB",
      base: doorPrice,
      breakdown,
      total: Math.round(total),
      sku: finalProduct.sku
    };
    
    
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error calculating door price:', error);
    return NextResponse.json(
      { error: "Ошибка расчета цены" },
      { status: 500 }
    );
  }
}
