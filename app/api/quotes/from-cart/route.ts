// api/quotes/from-cart/route.ts
// API роут для создания КП из корзины

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applyPricing } from '@/lib/doors/pricing';

type CartItem = {
  sku: string;
  model: string;
  width?: number;
  height?: number;
  color?: string;
  finish?: string;
  series?: string;
  material?: string;
  rrc_price: number;
  qty: number;
  hardware_kit?: {
    name: string;
    price_rrc: number;
    group?: string;
  };
  handle?: {
    name: string;
    price_opt: number;
    price_group_multiplier: number;
  };
  price_opt?: number;
  currency?: string;
};

type CartToQuoteRequest = {
  cart: {
    items: CartItem[];
  };
  quoteData: {
    title?: string;
    clientInfo?: {
      company?: string;
      contact?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    notes?: string;
  };
};

// POST /api/quotes/from-cart - Создать КП из корзины
export async function POST(req: NextRequest) {
  try {
    const body: CartToQuoteRequest = await req.json();
    
    // Валидация входных данных
    if (!body.cart || !Array.isArray(body.cart.items) || body.cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Корзина должна содержать хотя бы одну позицию' },
        { status: 400 }
      );
    }

    // Получаем данные дверей из каталога для валидации и дополнения
    const cartItems = body.cart.items;
    const skus = cartItems.map(item => item.sku);
    
    const catalogItems = await prisma.doors_catalog.findMany({
      where: { sku: { in: skus } },
      select: {
        sku: true,
        series: true,
        model: true,
        finish: true,
        color: true,
        widthMm: true,
        heightMm: true,
        base_price: true,
        price_opt: true,
        currency: true
      }
    });

    // Создаем мапу для быстрого поиска
    const catalogMap = new Map(catalogItems.map(item => [item.sku, item]));

    // Обрабатываем позиции корзины
    const processedItems = cartItems.map(cartItem => {
      const catalogItem = catalogMap.get(cartItem.sku);
      
      // Используем данные из каталога, если они есть, иначе из корзины
      return {
        sku: cartItem.sku,
        model: catalogItem?.model || cartItem.model,
        width: catalogItem?.widthMm || cartItem.width,
        height: catalogItem?.heightMm || cartItem.height,
        color: catalogItem?.color || cartItem.color,
        finish: catalogItem?.finish || cartItem.finish,
        series: catalogItem?.series || cartItem.series,
        material: cartItem.material,
        rrc_price: catalogItem?.base_price || cartItem.rrc_price,
        qty: cartItem.qty,
        hardware_kit: cartItem.hardware_kit,
        handle: cartItem.handle,
        price_opt: catalogItem?.price_opt || cartItem.price_opt,
        currency: catalogItem?.currency || cartItem.currency || 'RUB'
      };
    });

    // Применяем ценообразование для расчета итоговой суммы
    const pricedItems = applyPricing(processedItems);
    const total = pricedItems.reduce((sum, item) => sum + item.sum_rrc, 0);

    // Создаем КП
    const quote = await prisma.quote.create({
      data: {
        title: body.quoteData?.title || `КП от ${new Date().toLocaleDateString()}`,
        status: 'draft',
        items: processedItems,
        total: total,
        currency: processedItems[0]?.currency || 'RUB',
        clientInfo: body.quoteData?.clientInfo || undefined,
        notes: body.quoteData?.notes || undefined
      },
      select: {
        id: true,
        title: true,
        status: true,
        items: true,
        total: true,
        currency: true,
        clientInfo: true,
        notes: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'КП успешно создан из корзины',
      quote: {
        ...quote,
        total: Number(quote.total),
        items: JSON.parse(JSON.stringify(quote.items)),
        clientInfo: quote.clientInfo ? JSON.parse(JSON.stringify(quote.clientInfo)) : null
      },
      pricing: {
        itemsCount: processedItems.length,
        totalAmount: total,
        currency: processedItems[0]?.currency || 'RUB'
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating quote from cart:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании КП из корзины' },
      { status: 500 }
    );
  }
}

// GET /api/quotes/from-cart - Получить информацию о возможности создания КП
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cartData = searchParams.get('cart');
    
    if (!cartData) {
      return NextResponse.json({
        canCreateQuote: false,
        message: 'Необходимо передать данные корзины'
      });
    }

    let cart;
    try {
      cart = JSON.parse(cartData);
    } catch (e) {
      return NextResponse.json({
        canCreateQuote: false,
        message: 'Некорректные данные корзины'
      });
    }

    if (!cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
      return NextResponse.json({
        canCreateQuote: false,
        message: 'Корзина пуста'
      });
    }

    // Проверяем доступность товаров в каталоге
    const skus = cart.items.map((item: any) => item.sku);
    const catalogItems = await prisma.doors_catalog.findMany({
      where: { sku: { in: skus } },
      select: { sku: true, base_price: true, currency: true }
    });

    const availableSkus = new Set(catalogItems.map(item => item.sku));
    const missingItems = cart.items.filter((item: any) => !availableSkus.has(item.sku));

    return NextResponse.json({
      canCreateQuote: true,
      cartInfo: {
        itemsCount: cart.items.length,
        availableItems: cart.items.length - missingItems.length,
        missingItems: missingItems.map((item: any) => item.sku),
        estimatedTotal: cart.items.reduce((sum: number, item: any) => sum + (item.rrc_price * item.qty), 0)
      },
      message: missingItems.length > 0 
        ? `Некоторые товары (${missingItems.length}) не найдены в каталоге`
        : 'Все товары доступны для создания КП'
    });

  } catch (error: any) {
    console.error('Error checking cart for quote creation:', error);
    return NextResponse.json(
      { error: 'Ошибка при проверке корзины' },
      { status: 500 }
    );
  }
}
