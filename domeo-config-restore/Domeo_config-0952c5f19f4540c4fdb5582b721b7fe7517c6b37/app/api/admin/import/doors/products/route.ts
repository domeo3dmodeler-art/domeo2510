import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Получаем реальные данные из базы
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        brand: true,
        model: true,
        series: true,
        base_price: true,
        currency: true,
        stock_quantity: true,
        properties_data: true,
        created_at: true,
        catalog_category: {
          select: {
            id: true,
            name: true,
            level: true,
            path: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit
    });

    if (format === "csv") {
      // Возвращаем CSV с реальными данными
      const headers = [
        "ID",
        "SKU",
        "Название",
        "Описание",
        "Бренд",
        "Модель",
        "Серия",
        "Базовая цена",
        "Валюта",
        "Остаток",
        "Категория",
        "Дата создания"
      ];
      
      const csvRows = [headers.join(",")];
      
      products.forEach(product => {
        const properties = product.properties_data ? 
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
        
        const row = [
          product.id || '',
          product.sku || '',
          product.name || '',
          product.description || '',
          product.brand || '',
          product.model || '',
          product.series || '',
          product.base_price || '',
          product.currency || '',
          product.stock_quantity || '',
          product.catalog_category?.name || '',
          product.created_at ? new Date(product.created_at).toISOString() : ''
        ];
        csvRows.push(row.join(","));
      });
      
      return new Response(csvRows.join("\n"), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="imported_products.csv"',
        },
      });
    }

    // Возвращаем JSON формат с реальными данными
    const summary = {
      by_brand: {},
      by_price_range: {},
      total_value: 0
    };

    products.forEach(product => {
      // Группировка по бренду
      const brand = product.brand || 'Неизвестно';
      summary.by_brand[brand] = (summary.by_brand[brand] || 0) + 1;
      
      // Группировка по ценовому диапазону
      const price = parseFloat(product.base_price) || 0;
      summary.total_value += price;
      
      if (price < 10000) {
        summary.by_price_range['< 10,000'] = (summary.by_price_range['< 10,000'] || 0) + 1;
      } else if (price < 20000) {
        summary.by_price_range['10,000 - 20,000'] = (summary.by_price_range['10,000 - 20,000'] || 0) + 1;
      } else {
        summary.by_price_range['> 20,000'] = (summary.by_price_range['> 20,000'] || 0) + 1;
      }
    });

    return NextResponse.json({
      total: products.length,
      shown: products.length,
      products: products,
      demo_mode: false,
      message: "Данные загружены из базы данных",
      summary: summary
    });
  } catch (error) {
    console.error('Error fetching imported products:', error);
    return NextResponse.json(
      { error: "Ошибка получения данных" },
      { status: 500 }
    );
  }
}