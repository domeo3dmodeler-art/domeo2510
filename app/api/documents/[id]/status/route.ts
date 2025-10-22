import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/documents/[id]/status - Изменение статуса документа
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    console.log(`🔄 Изменение статуса документа ${id} на ${status}`);

    // Ищем документ в таблице document
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      console.log(`❌ Документ с ID ${id} не найден`);
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      );
    }

    // Обновляем статус
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { 
        status,
        updated_at: new Date()
      }
    });

    console.log(`✅ Статус документа ${id} изменен на ${status}`);

    // TODO: Добавить запись в историю изменений
    // await addToHistory(id, documentType, 'status_changed', document.status, status);

    return NextResponse.json({
      success: true,
      document: updatedDocument
    });

  } catch (error) {
    console.error('❌ Ошибка изменения статуса документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса документа' },
      { status: 500 }
    );
  }
}
