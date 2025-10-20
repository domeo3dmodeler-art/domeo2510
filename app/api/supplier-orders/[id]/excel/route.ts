import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateExcelOrder } from '@/lib/export/puppeteer-generator';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Получаем заказ у поставщика
    const supplierOrder = await prisma.supplierOrder.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            client: true
          }
        }
      }
    });

    if (!supplierOrder) {
      return NextResponse.json({ error: 'Supplier order not found' }, { status: 404 });
    }

    // Получаем данные корзины
    let cartData = null;
    if (supplierOrder.cart_data) {
      try {
        cartData = JSON.parse(supplierOrder.cart_data);
      } catch (error) {
        console.error('Error parsing cart_data:', error);
      }
    }

    if (!cartData || !cartData.items) {
      return NextResponse.json({ error: 'No cart data found for this supplier order' }, { status: 400 });
    }

    // Подготавливаем данные для генерации Excel
    const excelData = {
      client: supplierOrder.order.client,
      items: cartData.items,
      documentNumber: `ЗП-${supplierOrder.id.slice(-6)}`,
      supplierName: supplierOrder.supplier_name,
      supplierEmail: supplierOrder.supplier_email,
      supplierPhone: supplierOrder.supplier_phone,
      expectedDate: supplierOrder.expected_date,
      notes: supplierOrder.notes
    };

    // Генерируем Excel файл
    const buffer = await generateExcelOrder(excelData);

    // Возвращаем файл
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Заказ_у_поставщика_${supplierOrder.id.slice(-6)}.xlsx"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating Excel for supplier order:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    );
  }
}
