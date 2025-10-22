import { NextRequest, NextResponse } from 'next/server';
import { exportDocumentWithPDF } from '@/lib/export/puppeteer-generator';
import { prisma } from '@/lib/prisma';
import { generateCartSessionId } from '@/lib/utils/cart-session';

// Улучшенный API для экспорта из корзины с интеграцией в документооборот
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      cart, 
      documentType, 
      format = 'pdf',
      clientId,
      sourceDocumentId, // ID исходного документа (если создается на основе существующего)
      sourceDocumentType, // Тип исходного документа
      userId = 'system',
      additionalData = {}
    } = body;

    console.log('🔄 Cart export request:', { 
      documentType, 
      format, 
      clientId, 
      sourceDocumentId, 
      sourceDocumentType,
      itemsCount: cart?.items?.length 
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { error: "Корзина пуста" },
        { status: 400 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "ID клиента обязателен" },
        { status: 400 }
      );
    }

    // Получаем данные клиента
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, middleName: true, phone: true, address: true }
    });

    if (!client) {
      return NextResponse.json(
        { error: "Клиент не найден" },
        { status: 404 }
      );
    }

    // Вычисляем общую сумму
    const totalAmount = cart.items.reduce((sum: number, item: any) => 
      sum + (item.unitPrice || 0) * (item.qty || item.quantity || 1), 0
    );

    // Генерируем уникальный cart_session_id для этой сессии корзины
    const cartSessionId = generateCartSessionId();
    
    // Генерируем документ с помощью существующей системы
    const exportResult = await exportDocumentWithPDF(
      documentType as 'quote' | 'invoice' | 'order',
      format as 'pdf' | 'excel' | 'csv',
      clientId,
      cart.items,
      totalAmount,
      cartSessionId
    );

    console.log('✅ Document generated:', {
      documentId: exportResult.documentId,
      documentType: exportResult.documentType,
      documentNumber: exportResult.documentNumber
    });

    // Если есть исходный документ, создаем связь
    if (sourceDocumentId && sourceDocumentType) {
      await createDocumentRelationship(
        sourceDocumentType,
        sourceDocumentId,
        exportResult.documentType!,
        exportResult.documentId!,
        userId
      );
    }

    // Записываем в историю
    await prisma.documentHistory.create({
      data: {
        document_type: exportResult.documentType!,
        document_id: exportResult.documentId!,
        action: sourceDocumentId ? 'created_from_cart' : 'created_from_cart',
        new_value: JSON.stringify({
          sourceDocumentId,
          sourceDocumentType,
          cartItemsCount: cart.items.length,
          totalAmount,
          format
        }),
        user_id: userId,
        notes: sourceDocumentId 
          ? `Создан из корзины на основе ${sourceDocumentType} ${sourceDocumentId}`
          : 'Создан из корзины'
      }
    });

    return NextResponse.json({
      success: true,
      document: {
        id: exportResult.documentId,
        type: exportResult.documentType,
        number: exportResult.documentNumber,
        totalAmount,
        clientId,
        sourceDocumentId,
        sourceDocumentType
      },
      file: {
        buffer: exportResult.buffer.toString('base64'),
        filename: exportResult.filename,
        mimeType: exportResult.mimeType
      },
      message: `${documentType} успешно создан из корзины`
    });

  } catch (error) {
    console.error('❌ Error in cart export:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании документа из корзины' },
      { status: 500 }
    );
  }
}

// Создание связи между документами
async function createDocumentRelationship(
  sourceType: string,
  sourceId: string,
  targetType: string,
  targetId: string,
  userId: string
) {
  try {
    // Обновляем связи в зависимости от типов документов
    if (sourceType === 'quote' && targetType === 'order') {
      await prisma.order.update({
        where: { id: targetId },
        data: { quote_id: sourceId }
      });
    } else if (sourceType === 'quote' && targetType === 'invoice') {
      await prisma.invoice.update({
        where: { id: targetId },
        data: { quote_id: sourceId }
      });
    } else if (sourceType === 'order' && targetType === 'invoice') {
      await prisma.invoice.update({
        where: { id: targetId },
        data: { order_id: sourceId }
      });
    } else if (sourceType === 'order' && targetType === 'supplier_order') {
      await prisma.supplierOrder.update({
        where: { id: targetId },
        data: { order_id: sourceId }
      });
    }

    console.log('✅ Document relationship created:', { sourceType, sourceId, targetType, targetId });
  } catch (error) {
    console.error('❌ Error creating document relationship:', error);
    // Не прерываем выполнение, если не удалось создать связь
  }
}

// API для получения доступных форматов экспорта
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get('documentType');

    const availableFormats = {
      quote: ['pdf', 'excel', 'csv'],
      invoice: ['pdf', 'excel', 'csv'],
      order: ['pdf', 'excel', 'csv'],
      supplier_order: ['pdf', 'excel']
    };

    const formats = documentType 
      ? availableFormats[documentType as keyof typeof availableFormats] || []
      : Object.keys(availableFormats);

    return NextResponse.json({
      success: true,
      formats,
      documentTypes: Object.keys(availableFormats)
    });

  } catch (error) {
    console.error('❌ Error fetching export formats:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении форматов экспорта' },
      { status: 500 }
    );
  }
}
