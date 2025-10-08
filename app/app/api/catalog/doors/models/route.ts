import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');

    // Получаем модели из базы данных
    const products = await prisma.product.findMany({
      select: {
        model: true,
        series: true
      },
      distinct: ['model', 'series'],
      where: {
        model: {
          not: null
        }
      },
      orderBy: {
        model: 'asc'
      }
    });

    const models = products.map(product => ({
      model: product.model,
      style: product.series
    }));

    return NextResponse.json({
      ok: true,
      models: models
    });
  } catch (error) {
    console.error('Error fetching door models:', error);
    return NextResponse.json(
      { error: "Ошибка получения моделей" },
      { status: 500 }
    );
  }
}