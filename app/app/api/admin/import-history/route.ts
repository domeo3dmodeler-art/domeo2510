import { NextRequest, NextResponse } from "next/server";

// Простое хранилище в памяти для демонстрации
// В реальном приложении это будет база данных
let importHistory: { [categoryId: string]: any[] } = {
  'doors': [
    {
      id: '1',
      filename: 'doors_price_2025_01.xlsx',
      imported_at: '2025-01-15T10:30:00Z',
      products_count: 150,
      status: 'completed'
    },
    {
      id: '2',
      filename: 'doors_price_2025_02.xlsx',
      imported_at: '2025-01-20T14:15:00Z',
      products_count: 200,
      status: 'completed'
    }
  ],
  'flooring': [],
  'kitchens': [],
  'tiles': []
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    
    console.log('=== IMPORT HISTORY API CALL ===');
    console.log('Category:', category);
    
    if (!category) {
      return NextResponse.json(
        { error: "Категория не указана" },
        { status: 400 }
      );
    }
    
    const history = importHistory[category] || [];
    console.log('History for category:', history);
    
    return NextResponse.json({
      ok: true,
      history: history,
      category: category
    });
  } catch (error) {
    console.error('Error fetching import history:', error);
    return NextResponse.json(
      { error: "Ошибка получения истории импортов" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { category, filename, products_count, status } = await req.json();
    
    if (!category || !filename) {
      return NextResponse.json(
        { error: "Не указаны обязательные параметры" },
        { status: 400 }
      );
    }
    
    // Добавляем новый импорт в историю
    if (!importHistory[category]) {
      importHistory[category] = [];
    }
    
    const newImport = {
      id: `import_${Date.now()}`,
      filename: filename,
      imported_at: new Date().toISOString(),
      products_count: products_count || 0,
      status: status || 'completed'
    };
    
    importHistory[category].unshift(newImport); // Добавляем в начало списка
    
    console.log(`Added import to history for category ${category}:`, newImport);
    
    return NextResponse.json({ 
      success: true, 
      import: newImport 
    });
  } catch (error) {
    console.error('Error adding import to history:', error);
    return NextResponse.json(
      { error: "Ошибка добавления импорта в историю" },
      { status: 500 }
    );
  }
}
