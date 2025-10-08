import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Строим WHERE условие для фильтрации
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (style) {
      whereConditions.push(`style = $${paramIndex}`);
      params.push(style);
      paramIndex++;
    }
    if (model) {
      whereConditions.push(`model = $${paramIndex}`);
      params.push(model);
      paramIndex++;
    }
    if (finish) {
      whereConditions.push(`finish = $${paramIndex}`);
      params.push(finish);
      paramIndex++;
    }
    if (color) {
      whereConditions.push(`color = $${paramIndex}`);
      params.push(color);
      paramIndex++;
    }
    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }
    if (width) {
      whereConditions.push(`width = $${paramIndex}`);
      params.push(parseInt(width));
      paramIndex++;
    }
    if (height) {
      whereConditions.push(`height = $${paramIndex}`);
      params.push(parseInt(height));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Получаем все продукты и извлекаем уникальные значения из properties_data
    const products = await prisma.product.findMany({
      select: {
        model: true,
        series: true,
        brand: true,
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

      if (product.series) distinctStyles.add(product.series);
      if (product.model) distinctModels.add(product.model);
      if (properties.finish) distinctFinishes.add(properties.finish);
      if (properties.color) distinctColors.add(properties.color);
      if (properties.type) distinctTypes.add(properties.type);
      if (properties.width) distinctWidths.add(Number(properties.width));
      if (properties.height) distinctHeights.add(Number(properties.height));
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

    return NextResponse.json({
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