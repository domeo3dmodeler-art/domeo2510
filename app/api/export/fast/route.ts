import { NextRequest, NextResponse } from 'next/server';
import { 
  exportDocumentWithPDF, 
  cleanupExportResources 
} from '@/lib/export/puppeteer-generator';
import { generateCartSessionId } from '@/lib/utils/cart-session';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

// POST /api/export/fast - Быстрый экспорт документов
export async function POST(request: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(request);
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
    
    logger.debug('Fast export request', 'export/fast', { 
      type, 
      format, 
      clientId, 
      itemsCount: items?.length || 0, 
      totalAmount 
    }, loggingContext);

    // Валидация входных данных
    if (!type || !format || !clientId || !items || !Array.isArray(items)) {
      logger.warn('Validation failed', 'export/fast', { type, format, clientId, hasItems: !!items }, loggingContext);
      return NextResponse.json(
        { error: 'Неверные параметры запроса' },
        { status: 400 }
      );
    }

    if (!['quote', 'invoice', 'order'].includes(type)) {
      logger.warn('Invalid document type', 'export/fast', { type }, loggingContext);
      return NextResponse.json(
        { error: 'Неподдерживаемый тип документа' },
        { status: 400 }
      );
    }

    if (!['pdf', 'excel', 'csv'].includes(format)) {
      logger.warn('Invalid format', 'export/fast', { format }, loggingContext);
      return NextResponse.json(
        { error: 'Неподдерживаемый формат экспорта' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      logger.warn('Empty cart', 'export/fast', {}, loggingContext);
      return NextResponse.json(
        { error: 'Корзина пуста' },
        { status: 400 }
      );
    }

    logger.debug('Validation passed, starting export', 'export/fast', {}, loggingContext);

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
    
    logger.debug('Cart session and parent document', 'export/fast', { 
      cartSessionId: finalCartSessionId, 
      parentDocumentId 
    }, loggingContext);
    
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

  } catch (error: any) {
    logger.error('Fast export error', 'export/fast', { 
      error: error.message,
      stack: error.stack,
      type: error.name,
      details: error.toString()
    }, loggingContext);
    
    console.error('❌ Fast export error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    return NextResponse.json(
      { error: 'Ошибка при экспорте документа', details: error.message },
      { status: 500 }
    );
  }
}

