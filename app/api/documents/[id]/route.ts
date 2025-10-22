import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id] - Получение документа по ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    console.log(`🔍 Получаем документ с ID: ${id}`);

    // Ищем документ в таблице document
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            address: true,
            email: true
          }
        },
        document_comments: {
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                middle_name: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!document) {
      console.log(`❌ Документ с ID ${id} не найден`);
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      );
    }

    console.log(`✅ Найден документ: ${document.number}`);

    // Получаем историю изменений статуса
    const history = await getDocumentHistory(id);

    // Парсим данные документа
    const content = document.content ? JSON.parse(document.content) : {};
    const documentData = document.documentData ? JSON.parse(document.documentData) : null;

    return NextResponse.json({
      ...document,
      type: document.type,
      content,
      documentData,
      history
    });

  } catch (error) {
    console.error('❌ Ошибка получения документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении документа' },
      { status: 500 }
    );
  }
}

// Получение истории изменений документа
async function getDocumentHistory(documentId: string) {
  try {
    // Здесь можно добавить логику получения истории изменений
    // Пока возвращаем базовую информацию
    return [
      {
        id: '1',
        action: 'created',
        description: 'Документ создан',
        timestamp: new Date().toISOString(),
        user: 'system'
      }
    ];
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    return [];
  }
}
