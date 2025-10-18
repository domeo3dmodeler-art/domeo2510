import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const style = searchParams.get('style');

    console.log('🔍 API complete-data-simple - загрузка данных для стиля:', style || 'все');

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
      take: 100 // Ограничиваем для тестирования
    });

    console.log(`📦 Загружено ${products.length} товаров из БД`);

    // Простая обработка данных
    const models: any[] = [];
    const styles = new Set<string>();

    products.forEach(product => {
      try {
        const properties = product.properties_data ?
          (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};

        const model = properties['Domeo_Название модели для Web'];
        const productStyle = properties['Domeo_Стиль Web'];
        const productPhotos = properties.photos || [];

        if (model && productStyle) {
          // Фильтруем по стилю если указан
          if (style && productStyle !== style) {
            return;
          }

          styles.add(productStyle);

          // Проверяем, есть ли уже такая модель
          const existingModel = models.find(m => m.model === model);
          if (!existingModel) {
            models.push({
              model,
              style: productStyle,
              photo: productPhotos.length > 0 ? productPhotos[0] : null,
              options: {
                finishes: [],
                colors: [],
                types: [],
                widths: [],
                heights: []
              }
            });
          }
        }
      } catch (error) {
        console.warn(`Ошибка обработки товара ${product.sku}:`, error);
      }
    });

    const result = {
      models: models.sort((a, b) => a.model.localeCompare(b.model)),
      totalModels: models.length,
      styles: Array.from(styles),
      timestamp: Date.now()
    };

    console.log(`✅ API complete-data-simple - найдено ${models.length} моделей`);

    return NextResponse.json({
      ok: true,
      ...result
    });

  } catch (error) {
    console.error('❌ Ошибка API complete-data-simple:', error);
    return NextResponse.json(
      { error: 'Failed to fetch complete data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
