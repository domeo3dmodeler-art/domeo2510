import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    console.log('=== STATS API CALL ===');
    
    // Получаем реальные данные из БД
    const categories = await prisma.catalogCategory.findMany({
      where: { is_active: true },
      include: {
        products: {
          select: { id: true }
        }
      }
    });

    // Получаем статистику импортов
    const importHistory = await prisma.importHistory.findMany({
      orderBy: { created_at: 'desc' },
      take: 100
    });

    // Группируем импорты по категориям
    const categoryImportStats: { [key: string]: { count: number, lastImport: string | null } } = {};
    
    importHistory.forEach(importItem => {
      const categoryId = importItem.catalog_category_id;
      if (!categoryImportStats[categoryId]) {
        categoryImportStats[categoryId] = { count: 0, lastImport: null };
      }
      categoryImportStats[categoryId].count++;
      if (!categoryImportStats[categoryId].lastImport) {
        categoryImportStats[categoryId].lastImport = importItem.created_at.toISOString();
      }
    });

    // Формируем активные категории
    const activeCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      totalProducts: category.products.length,
      lastImport: categoryImportStats[category.id]?.lastImport || null,
      totalImports: categoryImportStats[category.id]?.count || 0,
      isActive: category.is_active
    }));
    
    // Общая статистика
    const totalStats = {
      totalCategories: activeCategories.length,
      totalProducts: activeCategories.reduce((sum, cat) => sum + cat.totalProducts, 0),
      lastImport: activeCategories.reduce((latest, cat) => {
        if (!cat.lastImport) return latest;
        if (!latest) return cat.lastImport;
        return new Date(cat.lastImport) > new Date(latest) ? cat.lastImport : latest;
      }, null as string | null),
      totalImports: activeCategories.reduce((sum, cat) => sum + cat.totalImports, 0)
    };
    
    const result = {
      categories: activeCategories,
      total: totalStats
    };
    
    console.log('Active categories:', activeCategories);
    console.log('Total stats:', totalStats);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: "Ошибка получения статистики" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imported, filename, category } = await req.json();
    
    // Создаем запись в истории импортов
    if (category) {
      await prisma.importHistory.create({
        data: {
          catalog_category_id: category,
          filename: filename || 'unknown',
          imported_count: imported || 0,
          status: 'completed',
          created_at: new Date()
        }
      });
      
      console.log(`Created import history record for category ${category}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating stats:', error);
    return NextResponse.json(
      { error: "Ошибка обновления статистики" },
      { status: 500 }
    );
  }
}
