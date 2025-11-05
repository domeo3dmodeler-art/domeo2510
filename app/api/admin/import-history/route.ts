import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    
    // Получаем историю импортов из базы данных
    const history = await prisma.importHistory.findMany({
      where: {
        catalog_category_id: category
      },
      select: {
        id: true,
        filename: true,
        imported_count: true,
        status: true,
        created_at: true,
        errors: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // Форматируем данные для совместимости с фронтендом
    const formattedHistory = history.map(item => ({
      id: item.id,
      filename: item.filename,
      imported_at: item.created_at.toISOString(),
      products_count: item.imported_count,
      status: item.status === 'completed' ? 'completed' : 'failed',
      error_message: item.errors
    }));
    
    console.log('History for category:', formattedHistory);
    
    return NextResponse.json({
      ok: true,
      history: formattedHistory,
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
    const { category, filename, imported, status, error_message } = await req.json();
    
    console.log('=== IMPORT HISTORY POST ===');
    console.log('Category:', category, 'Filename:', filename, 'Imported:', imported);
    
    if (!category || !filename) {
      return NextResponse.json(
        { error: "Категория и имя файла обязательны" },
        { status: 400 }
      );
    }
    
    // Создаем запись в истории импортов
    const importRecord = await prisma.importHistory.create({
      data: {
        catalog_category_id: category,
        filename: filename,
        imported_count: imported || 0,
        status: status || 'completed',
        errors: error_message || '[]',
        created_at: new Date()
      }
    });
    
    console.log('Created import history record:', importRecord.id);
    
    return NextResponse.json({
      ok: true,
      id: importRecord.id,
      message: "Запись истории импорта создана"
    });
  } catch (error) {
    console.error('Error creating import history:', error);
    return NextResponse.json(
      { error: "Ошибка создания записи истории импорта" },
      { status: 500 }
    );
  }
}