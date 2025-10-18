import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    // Очищаем все категории каталога
    const result = await prisma.catalogCategory.deleteMany({});
    
    return NextResponse.json({
      success: true,
      message: `Удалено ${result.count} категорий каталога`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Error clearing catalog:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Ошибка при очистке каталога',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
