import { NextRequest, NextResponse } from 'next/server';

// POST /api/cart/restore-from-document - Восстановить корзину из документа
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, documentType } = body;

    if (!documentId || !documentType) {
      return NextResponse.json({ error: 'Document ID and type are required' }, { status: 400 });
    }

    console.log('🔄 Restoring cart from document:', { documentId, documentType });

    // Получаем данные корзины из документа
    const cartDataResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/documents/${documentId}/cart-data?type=${documentType}`);
    
    if (!cartDataResponse.ok) {
      const error = await cartDataResponse.json();
      return NextResponse.json({ error: error.error || 'Failed to fetch cart data' }, { status: 400 });
    }

    const cartDataResult = await cartDataResponse.json();
    const cartData = cartDataResult.document.cartData;

    if (!cartData) {
      return NextResponse.json({ error: 'No cart data found in document' }, { status: 404 });
    }

    console.log('✅ Cart data restored:', { 
      documentId, 
      documentType, 
      itemsCount: cartData.items?.length || 0,
      totalAmount: cartData.totalAmount 
    });

    return NextResponse.json({
      success: true,
      cartData: cartData,
      document: cartDataResult.document
    });

  } catch (error: any) {
    console.error('❌ Error restoring cart from document:', error);
    return NextResponse.json(
      { error: 'Failed to restore cart from document' },
      { status: 500 }
    );
  }
}
