// scripts/cleanup-categories.ts
// Скрипт для удаления пустых категорий

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupCategories() {
  try {
    console.log('🧹 Очищаем пустые категории...');

    // Получаем все категории с подсчетом товаров
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
            subcategories: true
          }
        }
      }
    });

    console.log('📊 Найденные категории:');
    categories.forEach(cat => {
      console.log(`- ${cat.name} (${cat.slug}): товаров=${cat._count.products}, подкатегорий=${cat._count.subcategories}`);
    });

    // Удаляем категории без товаров и подкатегорий
    const emptyCategories = categories.filter(cat => 
      cat._count.products === 0 && cat._count.subcategories === 0
    );

    if (emptyCategories.length === 0) {
      console.log('✅ Пустых категорий не найдено');
      return;
    }

    console.log(`🗑️ Удаляем ${emptyCategories.length} пустых категорий:`);
    
    for (const category of emptyCategories) {
      console.log(`- Удаляем: ${category.name} (${category.slug})`);
      await prisma.category.delete({
        where: { id: category.id }
      });
    }

    console.log('✅ Очистка завершена!');

  } catch (error) {
    console.error('❌ Ошибка при очистке категорий:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем очистку
cleanupCategories();
