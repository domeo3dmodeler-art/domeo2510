// api/quotes/preview/route.ts
// API роут для предпросмотра PDF шаблонов КП

import { NextRequest, NextResponse } from 'next/server';
import { generateQuotePDF } from '@/lib/pdf/quote-pdf';

// GET /api/quotes/preview - Предпросмотр PDF шаблона
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Создаем демонстрационный КП для предпросмотра
    const demoQuote = {
      id: 'preview-demo',
      title: 'Демонстрационное коммерческое предложение',
      status: 'draft' as const,
      items: [
        {
          sku: 'DOOR-DEMO-001',
          model: 'Premium Classic',
          width: 800,
          height: 2000,
          color: 'Белый',
          finish: 'Матовый',
          series: 'Premium',
          material: 'МДФ',
          rrc_price: 15000,
          qty: 1,
          hardware_kit: {
            name: 'Комплект Premium',
            price_rrc: 3000,
            group: '1'
          },
          handle: {
            name: 'Ручка Classic',
            price_opt: 500,
            price_group_multiplier: 2.5
          },
          price_opt: 12000,
          currency: 'RUB'
        },
        {
          sku: 'DOOR-DEMO-002',
          model: 'Standard Basic',
          width: 900,
          height: 2100,
          color: 'Серый',
          finish: 'Глянцевый',
          series: 'Standard',
          material: 'МДФ',
          rrc_price: 12000,
          qty: 2,
          hardware_kit: {
            name: 'Комплект Basic',
            price_rrc: 2000,
            group: '1'
          },
          handle: {
            name: 'Ручка Basic',
            price_opt: 300,
            price_group_multiplier: 2.0
          },
          price_opt: 10000,
          currency: 'RUB'
        }
      ],
      total: 45000, // Примерная сумма
      currency: 'RUB',
      clientInfo: {
        company: 'ООО "Демо Клиент"',
        contact: 'Иванов Иван Иванович',
        email: 'demo@client.ru',
        phone: '+7 (495) 123-45-67',
        address: 'г. Москва, ул. Демонстрационная, д. 1'
      },
      notes: 'Это демонстрационное коммерческое предложение для предпросмотра шаблона.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      acceptedAt: undefined
    };

    // Генерируем PDF
    const pdfBuffer = await generateQuotePDF(demoQuote);
    const filename = `quote_preview_${templateId}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Возвращаем PDF файл
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error: any) {
    console.error('Error generating quote preview:', error);
    return NextResponse.json(
      { error: 'Ошибка при генерации предпросмотра PDF' },
      { status: 500 }
    );
  }
}
