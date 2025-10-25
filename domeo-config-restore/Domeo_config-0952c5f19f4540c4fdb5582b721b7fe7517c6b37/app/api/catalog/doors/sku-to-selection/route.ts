import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/catalog/doors/sku-to-selection - Получить информацию о продукте по SKU
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get('sku');
    
    if (!sku) {
      return NextResponse.json({
        ok: true,
        message: "API для получения информации о продукте по SKU",
        usage: "Используйте GET запрос с параметром sku или POST запрос с телом { sku: 'SKU_CODE' }",
        example: {
          method: "GET",
          url: "/api/catalog/doors/sku-to-selection?sku=SKU_CODE"
        }
      });
    }

    // Ищем продукт по SKU в базе данных
    const product = await prisma.product.findUnique({
      where: { sku },
      select: {
        id: true,
        sku: true,
        name: true,
        model: true,
        series: true,
        brand: true,
        base_price: true,
        properties_data: true
      }
    });

    if (!product) {
      return NextResponse.json({
        ok: false,
        error: "Продукт не найден"
      });
    }

    // Парсим свойства продукта
    const properties = product.properties_data ? 
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

    // Возвращаем данные для предзаполнения формы
    const selection = {
      style: properties.style || product.series || "Классика",
      model: product.model || product.series || "Стандарт",
      finish: properties.finish || "Эмаль",
      color: properties.color || "Белый",
      type: properties.type || "Глухая",
      width: properties.width || 800,
      height: properties.height || 2000
    };

    return NextResponse.json({
      ok: true,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        model: product.model,
        series: product.series,
        brand: product.brand,
        base_price: product.base_price
      },
      selection
    });
  } catch (error) {
    console.error('Error in GET /api/catalog/doors/sku-to-selection:', error);
    return NextResponse.json(
      { error: "Ошибка поиска продукта" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku } = body;

    if (!sku) {
      return NextResponse.json(
        { error: "SKU не предоставлен" },
        { status: 400 }
      );
    }

    // Ищем продукт по SKU в базе данных
    const product = await prisma.product.findUnique({
      where: { sku },
      select: {
        id: true,
        sku: true,
        name: true,
        model: true,
        series: true,
        brand: true,
        base_price: true,
        properties_data: true
      }
    });

    if (!product) {
      return NextResponse.json({
        ok: false,
        error: "Продукт не найден"
      });
    }

    // Парсим свойства продукта
    const properties = product.properties_data ? 
      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

    // Возвращаем данные для предзаполнения формы
    const selection = {
      style: properties.style || product.series || "Классика",
      model: product.model || product.series || "Стандарт",
      finish: properties.finish || "Эмаль",
      color: properties.color || "Белый",
      type: properties.type || "Глухая",
      width: properties.width || 800,
      height: properties.height || 2000
    };

    return NextResponse.json({
      ok: true,
      selection
    });
  } catch (error) {
    console.error('Error finding product by SKU:', error);
    return NextResponse.json(
      { error: "Ошибка поиска продукта" },
      { status: 500 }
    );
  }
}