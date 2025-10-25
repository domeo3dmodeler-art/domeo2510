import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    console.log('=== COMPLECTOR STATS API CALL ===');
    
    // Получаем статистику клиентов
    const totalClients = await prisma.client.count({
      where: { isActive: true }
    }).catch(() => 0);

    // Получаем статистику КП (коммерческих предложений)
    const quotesInWork = await prisma.quote.count({
      where: { 
        status: { in: ['draft', 'sent', 'review'] }
      }
    }).catch(() => 0);

    // Получаем статистику счетов
    const totalInvoices = await prisma.invoice.count({
      where: { isActive: true }
    }).catch(() => 0);

    // Получаем статистику товаров из каталога
    const totalProducts = await prisma.product.count({
      where: { is_active: true }
    }).catch(() => 0);

    // Получаем статистику заказов
    const ordersInWork = await prisma.order.count({
      where: { 
        status: { in: ['new', 'processing', 'confirmed'] }
      }
    }).catch(() => 0);

    const completedOrders = await prisma.order.count({
      where: { 
        status: 'completed'
      }
    }).catch(() => 0);

    // Получаем последние активности
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        number: true,
        status: true,
        created_at: true,
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    }).catch(() => []);

    const recentQuotes = await prisma.quote.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        number: true,
        status: true,
        created_at: true,
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    }).catch(() => []);

    const stats = {
      clients: {
        total: totalClients,
        active: totalClients
      },
      quotes: {
        inWork: quotesInWork,
        total: await prisma.quote.count().catch(() => 0)
      },
      invoices: {
        total: totalInvoices,
        pending: await prisma.invoice.count({
          where: { status: 'pending' }
        }).catch(() => 0)
      },
      products: {
        total: totalProducts,
        active: totalProducts
      },
      orders: {
        inWork: ordersInWork,
        completed: completedOrders,
        total: await prisma.order.count().catch(() => 0)
      },
      recentActivity: [
        ...recentOrders.map(order => ({
          id: order.id,
          type: 'order',
          title: `Заказ #${order.number}`,
          client: `${order.client.lastName} ${order.client.firstName}`,
          status: order.status,
          createdAt: order.created_at,
          icon: '📋'
        })),
        ...recentQuotes.map(quote => ({
          id: quote.id,
          type: 'quote',
          title: `КП #${quote.number}`,
          client: `${quote.client.lastName} ${quote.client.firstName}`,
          status: quote.status,
          createdAt: quote.created_at,
          icon: '📄'
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)
    };

    console.log('📊 Complector stats:', stats);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching complector stats:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статистики комплектатора' },
      { status: 500 }
    );
  }
}
