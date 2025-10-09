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

      return (
        (!selection.style || properties['Domeo_Стиль Web'] === selection.style) &&
        (!selection.model || properties['Domeo_Название модели для Web']?.includes(selection.model)) &&
        (!selection.finish || properties['Общее_Тип покрытия'] === selection.finish) &&
        (!selection.color || properties['Domeo_Цвет'] === selection.color) &&
        (!selection.type || properties['Тип конструкции'] === selection.type) &&
        (!selection.width || properties['Ширина/мм'] === selection.width) &&
        (!selection.height || properties['Высота/мм'] === selection.height)
      );
    });

    if (!product) {
      return NextResponse.json(
        { error: "Продукт не найден" },
        { status: 404 }
      );
    }

    // Парсим свойства продукта
    const properties = product.properties_data ? 
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

    // Рассчитываем цену из поля РРЦ
    const rrcPrice = properties['Цена ррц (включая цену полотна, короба, наличников, доборов)'];
    let total = parseFloat(rrcPrice) || 0;
    const breakdown = [
      { label: "Цена РРЦ", amount: total }
    ];

    // Добавляем комплект фурнитуры если выбран
    if (selection.hardware_kit?.id) {
      // Пока используем статические данные для комплектов
      const kits = [
        { id: "KIT_STD", name: "Базовый комплект", price_rrc: 5000 },
        { id: "KIT_SOFT", name: "SoftClose", price_rrc: 2400 },
      ];
      
      const kit = kits.find(k => k.id === selection.hardware_kit.id);
      if (kit) {
        total += kit.price_rrc;
        breakdown.push({ 
          label: `Комплект: ${kit.name}`, 
          amount: kit.price_rrc 
        });
      }
    }

    // Добавляем ручку если выбрана
    if (selection.handle?.id) {
      // Пока используем статические данные для ручек
      const handles = [
        { id: "HNDL_PRO", name: "Pro", price_rrc: 1200 },
        { id: "HNDL_SIL", name: "Silver", price_rrc: 1400 },
      ];
      
      const handle = handles.find(h => h.id === selection.handle.id);
      if (handle) {
        total += handle.price_rrc;
        breakdown.push({ 
          label: `Ручка: ${handle.name}`, 
          amount: handle.price_rrc 
        });
      }
    }

    return NextResponse.json({
      ok: true,
      currency: "RUB",
      base: parseFloat(rrcPrice) || 0,
      breakdown,
      total: Math.round(total),
      sku: product.sku
    });
  } catch (error) {
    console.error('Error calculating door price:', error);
    return NextResponse.json(
      { error: "Ошибка расчета цены" },
      { status: 500 }
    );
  }
}
