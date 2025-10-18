import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json(
        { error: 'ID категории обязателен' },
        { status: 400 }
      );
    }

    console.log('Удаление всех товаров категории:', categoryId);

    // Подсчитываем количество товаров до удаления
    const countBefore = await prisma.product.count({
      where: { catalog_category_id: categoryId }
    });

    console.log(`Найдено товаров для удаления: ${countBefore}`);

    if (countBefore === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'В категории нет товаров для удаления'
      });
    }

    // Удаляем все товары категории
    const deleteResult = await prisma.product.deleteMany({
      where: { catalog_category_id: categoryId }
    });

    console.log(`Удалено товаров: ${deleteResult.count}`);

    // Обновляем счетчик товаров в категории
    await prisma.catalogCategory.update({
      where: { id: categoryId },
      data: { products_count: 0 }
    });

    console.log(`Обновлен счетчик товаров для категории ${categoryId}: 0`);

    // Обновляем счетчики всех родительских категорий
    try {
      const category = await prisma.catalogCategory.findUnique({
        where: { id: categoryId }
      });

      if (category && category.parent_id) {
        // Рекурсивно обновляем счетчики родительских категорий
        const updateParentCounts = async (parentId: string) => {
          const parentCategory = await prisma.catalogCategory.findUnique({
            where: { id: parentId },
            include: {
              subcategories: true
            }
          });

          if (parentCategory) {
            // Подсчитываем общее количество товаров в подкатегориях
            let totalProducts = 0;
            for (const subcategory of parentCategory.subcategories) {
              const subcategoryProducts = await prisma.product.count({
                where: { catalog_category_id: subcategory.id }
              });
              totalProducts += subcategoryProducts;
            }

            // Обновляем счетчик родительской категории
            await prisma.catalogCategory.update({
              where: { id: parentId },
              data: { products_count: totalProducts }
            });

            console.log(`Обновлен счетчик родительской категории ${parentId}: ${totalProducts}`);

            // Если есть еще родитель, продолжаем рекурсивно
            if (parentCategory.parent_id) {
              await updateParentCounts(parentCategory.parent_id);
            }
          }
        };

        await updateParentCounts(category.parent_id);
      }
    } catch (updateError) {
      console.error('Ошибка при обновлении счетчиков родительских категорий:', updateError);
    }

    return NextResponse.json({
      success: true,
      deleted: deleteResult.count,
      message: `Успешно удалено ${deleteResult.count} товаров`
    });

  } catch (error) {
    console.error('Ошибка при удалении товаров:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка при удалении товаров',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
