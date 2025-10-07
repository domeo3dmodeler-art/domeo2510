import { NextRequest, NextResponse } from "next/server";

// Простое хранилище в памяти для демонстрации
// В реальном приложении это будет база данных
let categoryStats: { [categoryId: string]: {
  name: string;
  totalProducts: number;
  lastImport: string | null;
  totalImports: number;
  isActive: boolean;
} } = {
  'doors': {
    name: 'Двери',
    totalProducts: 156,
    lastImport: '2024-01-30T10:30:00Z',
    totalImports: 3,
    isActive: true
  },
  'smart': {
    name: 'Смарт',
    totalProducts: 89,
    lastImport: '2024-01-28T14:20:00Z',
    totalImports: 2,
    isActive: true
  },
  'flooring': {
    name: 'Напольные покрытия',
    totalProducts: 0,
    lastImport: null,
    totalImports: 0,
    isActive: false
  },
  'kitchens': {
    name: 'Кухни',
    totalProducts: 0,
    lastImport: null,
    totalImports: 0,
    isActive: false
  },
  'tiles': {
    name: 'Плитка',
    totalProducts: 0,
    lastImport: null,
    totalImports: 0,
    isActive: false
  }
};

export async function GET(req: NextRequest) {
  try {
    console.log('=== STATS API CALL ===');
    
    // Получаем только активные категории
    const activeCategories = Object.entries(categoryStats)
      .filter(([_, stats]) => stats.isActive)
      .map(([id, stats]) => ({
        id,
        ...stats
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
    
    console.log('Active categories:', activeCategories);
    console.log('Total stats:', totalStats);
    
    return NextResponse.json({
      categories: activeCategories,
      total: totalStats
    });
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
    
    // Обновляем статистику для конкретной категории
    if (category && categoryStats[category]) {
      categoryStats[category].totalProducts += imported;
      categoryStats[category].lastImport = new Date().toISOString();
      categoryStats[category].totalImports += 1;
      
      console.log(`Updated stats for category ${category}:`, categoryStats[category]);
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
