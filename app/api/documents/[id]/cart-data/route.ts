import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id]/cart-data - Получить данные корзины из документа
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type'); // 'quote', 'invoice', 'order', 'supplier_order'

    if (!documentType) {
      return NextResponse.json({ error: 'Document type is required' }, { status: 400 });
    }

    console.log('🔄 Fetching cart data for document:', { id, documentType });

    let document: any = null;
    let cartData: any = null;

    switch (documentType) {
      case 'quote':
        document = await prisma.quote.findUnique({
          where: { id },
          select: { id: true, number: true, cart_data: true, client_id: true }
        });
        break;
      
      case 'invoice':
        document = await prisma.invoice.findUnique({
          where: { id },
          select: { id: true, number: true, cart_data: true, client_id: true }
        });
        break;
      
      case 'order':
        document = await prisma.order.findUnique({
          where: { id },
          select: { id: true, number: true, cart_data: true, client_id: true }
        });
        break;
      
      case 'supplier_order':
        document = await prisma.supplierOrder.findUnique({
          where: { id },
          select: { id: true, cart_data: true, parent_document_id: true }
        });
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Парсим JSON данные корзины
    if (document.cart_data) {
      try {
        cartData = JSON.parse(document.cart_data);
      } catch (error) {
        console.error('❌ Error parsing cart_data:', error);
        return NextResponse.json({ error: 'Invalid cart data format' }, { status: 400 });
      }
    }

    console.log('✅ Cart data retrieved:', { documentId: id, hasCartData: !!cartData });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        number: document.number || `DOC-${document.id.slice(-6)}`,
        type: documentType,
        clientId: document.client_id || document.parent_document_id,
        cartData: cartData
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching cart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart data' },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/cart-data - Сохранить данные корзины в документ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { documentType, cartData } = body;

    if (!documentType || !cartData) {
      return NextResponse.json({ error: 'Document type and cart data are required' }, { status: 400 });
    }

    console.log('💾 Saving cart data for document:', { id, documentType });

    const cartDataString = JSON.stringify(cartData);

    switch (documentType) {
      case 'quote':
        await prisma.quote.update({
          where: { id },
          data: { cart_data: cartDataString }
        });
        break;
      
      case 'invoice':
        await prisma.invoice.update({
          where: { id },
          data: { cart_data: cartDataString }
        });
        break;
      
      case 'order':
        await prisma.order.update({
          where: { id },
          data: { cart_data: cartDataString }
        });
        break;
      
      case 'supplier_order':
        await prisma.supplierOrder.update({
          where: { id },
          data: { cart_data: cartDataString }
        });
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    console.log('✅ Cart data saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Cart data saved successfully'
    });

  } catch (error: any) {
    console.error('❌ Error saving cart data:', error);
    return NextResponse.json(
      { error: 'Failed to save cart data' },
      { status: 500 }
    );
  }
}
