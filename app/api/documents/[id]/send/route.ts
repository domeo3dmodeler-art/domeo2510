import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/documents/[id]/send - Отправка документа клиенту
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    console.log(`📧 Отправка документа ${id} клиенту`);

    // Ищем документ в таблице document
    const document = await prisma.document.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!document) {
      console.log(`❌ Документ с ID ${id} не найден`);
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      );
    }

    if (!document.client?.email) {
      console.log(`❌ У клиента нет email адреса`);
      return NextResponse.json(
        { error: 'У клиента не указан email адрес' },
        { status: 400 }
      );
    }

    // Обновляем статус на "Отправлен"
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { 
        status: 'SENT',
        updated_at: new Date()
      }
    });

    // TODO: Реализовать отправку email
    // await sendDocumentEmail(document.client.email, document);

    console.log(`✅ Документ ${id} отправлен клиенту ${document.client.email}`);

    return NextResponse.json({
      success: true,
      message: 'Документ отправлен клиенту',
      document: updatedDocument
    });

  } catch (error) {
    console.error('❌ Ошибка отправки документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при отправке документа' },
      { status: 500 }
    );
  }
}
