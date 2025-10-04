import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { clientId, cartItems, documentType = 'quote' } = await request.json();

    if (!clientId || !cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Проверяем существование клиента
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Вычисляем общую стоимость
    const totalAmount = cartItems.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Создаем документ в зависимости от типа
    let document;
    
    switch (documentType) {
      case 'quote':
        // Создаем КП
        const quoteNumber = `KP-${Date.now()}`;
        document = await prisma.quote.create({
          data: {
            number: quoteNumber,
            client_id: clientId,
            created_by: 'system',
            status: 'DRAFT',
            subtotal: totalAmount,
            tax_amount: totalAmount * 0.2, // 20% НДС
            total_amount: totalAmount * 1.2,
            currency: 'RUB'
          }
        });

        // Создаем элементы КП
        for (const item of cartItems) {
          await prisma.quoteItem.create({
            data: {
              quote_id: document.id,
              product_id: item.productId || 'unknown',
              quantity: item.quantity,
              unit_price: item.price,
              total_price: item.price * item.quantity,
              notes: item.notes || null
            }
          });
        }
        break;

      case 'invoice':
        // Создаем счет
        const invoiceNumber = `INV-${Date.now()}`;
        document = await prisma.invoice.create({
          data: {
            number: invoiceNumber,
            client_id: clientId,
            created_by: 'system',
            status: 'DRAFT',
            subtotal: totalAmount,
            tax_amount: totalAmount * 0.2,
            total_amount: totalAmount * 1.2,
            currency: 'RUB'
          }
        });

        // Создаем элементы счета
        for (const item of cartItems) {
          await prisma.invoiceItem.create({
            data: {
              invoice_id: document.id,
              product_id: item.productId || 'unknown',
              quantity: item.quantity,
              unit_price: item.price,
              total_price: item.price * item.quantity,
              notes: item.notes || null
            }
          });
        }
        break;

      case 'order':
        // Создаем заказ
        const orderNumber = `ORD-${Date.now()}`;
        document = await prisma.order.create({
          data: {
            number: orderNumber,
            client_id: clientId,
            created_by: 'system',
            status: 'PENDING',
            subtotal: totalAmount,
            tax_amount: totalAmount * 0.2,
            total_amount: totalAmount * 1.2,
            currency: 'RUB'
          }
        });

        // Создаем элементы заказа
        for (const item of cartItems) {
          await prisma.orderItem.create({
            data: {
              order_id: document.id,
              product_id: item.productId || 'unknown',
              quantity: item.quantity,
              unit_price: item.price,
              total_price: item.price * item.quantity,
              notes: item.notes || null
            }
          });
        }
        break;

      default:
        // Создаем общий документ
        document = await prisma.document.create({
          data: {
            clientId,
            type: documentType,
            content: JSON.stringify({
              items: cartItems,
              totalAmount,
              createdAt: new Date().toISOString()
            }),
            status: 'draft'
          }
        });
    }

    return NextResponse.json({
      success: true,
      document,
      message: `Документ ${documentType} создан успешно`
    });

  } catch (error) {
    console.error('Error saving cart to client:', error);
    return NextResponse.json(
      { error: 'Failed to save cart to client' },
      { status: 500 }
    );
  }
}

