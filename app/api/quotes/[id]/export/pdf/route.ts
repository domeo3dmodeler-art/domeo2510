// api/quotes/[id]/export/pdf/route.ts
// API роут для экспорта КП в PDF

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateQuotePDF, getQuotePDFFilename } from '@/lib/pdf/quote-pdf';

// GET /api/quotes/[id]/export/pdf - Экспортировать КП в PDF
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        items: true,
        total: true,
        currency: true,
        clientInfo: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true
      }
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'КП не найден' },
        { status: 404 }
      );
    }

    // Преобразуем данные в формат для PDF
    const quoteData = {
      ...quote,
      total: Number(quote.total),
      items: JSON.parse(JSON.stringify(quote.items)),
      clientInfo: quote.clientInfo ? JSON.parse(JSON.stringify(quote.clientInfo)) : undefined,
      title: quote.title || undefined,
      notes: quote.notes || undefined,
      acceptedAt: quote.acceptedAt?.toISOString() || undefined,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
      status: quote.status as 'draft' | 'sent' | 'accepted' | 'rejected'
    };

    // Генерируем PDF
    const pdfBuffer = await generateQuotePDF(quoteData);
    const filename = getQuotePDFFilename(quoteData);

    // Возвращаем PDF файл
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating quote PDF:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации PDF' },
      { status: 500 }
    );
  }
}
