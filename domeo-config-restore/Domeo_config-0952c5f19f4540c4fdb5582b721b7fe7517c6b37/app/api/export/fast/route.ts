import { NextRequest, NextResponse } from 'next/server';
import { 
  exportDocumentWithPDF, 
  cleanupExportResources 
} from '@/lib/export/puppeteer-generator';
import { generateCartSessionId } from '@/lib/utils/cart-session';

// POST /api/export/fast - Быстрый экспорт документов
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      format, 
      clientId, 
      items, 
      totalAmount, 
      parentDocumentId, 
      cartSessionId 
    } = body;
    
    console.log('🚀 Fast export request:', { 
      type, 
      format, 
      clientId, 
      itemsCount: items.length, 
      totalAmount 
    });

    // Валидация входных данных
    if (!type || !format || !clientId || !items || !Array.isArray(items)) {
      console.error('❌ Validation failed:', { type, format, clientId, items });
      return NextResponse.json(
        { error: 'Неверные параметры запроса' },
        { status: 400 }
      );
    }

    if (!['quote', 'invoice', 'order'].includes(type)) {
      console.error('❌ Invalid document type:', type);
      return NextResponse.json(
        { error: 'Неподдерживаемый тип документа' },
        { status: 400 }
      );
    }

    if (!['pdf', 'excel', 'csv'].includes(format)) {
      console.error('❌ Invalid format:', format);
      return NextResponse.json(
        { error: 'Неподдерживаемый формат экспорта' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      console.error('❌ Empty cart');
      return NextResponse.json(
        { error: 'Корзина пуста' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed, starting export...');

    // Используем переданный cartSessionId или генерируем новый
    let finalCartSessionId = cartSessionId;
    
    if (!finalCartSessionId) {
      // Генерируем cart_session_id на основе содержимого корзины
      // Если корзина одинаковая - cart_session_id будет одинаковый
      const cartHash = Buffer.from(JSON.stringify({
        clientId,
        items: items.map(item => ({
          id: item.id,
          type: item.type,
          model: item.model,
          qty: item.qty,
          unitPrice: item.unitPrice
        })),
        totalAmount
      })).toString('base64').substring(0, 20);
      
      finalCartSessionId = `cart_${cartHash}`;
    }
    
    console.log('🛒 Cart session ID:', finalCartSessionId);
    console.log('👨‍👩‍👧‍👦 Parent document ID:', parentDocumentId);
    
    // Экспортируем документ с поддержкой связанных документов
    const result = await exportDocumentWithPDF(
      type,
      format,
      clientId,
      items,
      totalAmount,
      finalCartSessionId,
      parentDocumentId
    );

    // Возвращаем файл с информацией о документе
    // Убеждаемся, что filename содержит только латинские символы
    const safeFilename = result.filename.replace(/[^\x00-\x7F]/g, (char) => {
      const charCode = char.charCodeAt(0);
      if (charCode === 1050) return 'K'; // К
      if (charCode === 1055) return 'P'; // П
      if (charCode === 1057) return 'S'; // С
      if (charCode === 1095) return 'ch'; // ч
      if (charCode === 1077) return 'e'; // е
      if (charCode === 1090) return 't'; // т
      if (charCode === 1079) return 'z'; // з
      if (charCode === 1072) return 'a'; // а
      if (charCode === 1082) return 'k'; // к
      return 'X';
    });
    
    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': result.buffer.length.toString(),
        'X-Document-Id': result.documentId || '',
        'X-Document-Type': result.documentType || '',
        'X-Document-Number': result.documentNumber || '',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Fast export error:', error);
    return NextResponse.json(
      { error: 'Ошибка при экспорте документа' },
      { status: 500 }
    );
  }
}

