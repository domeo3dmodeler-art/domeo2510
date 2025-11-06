import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Статистика по статусам заказов
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    // Статистика по Комплектаторам
    const ordersByComplectator = await prisma.order.groupBy({
      by: ['complectator_id'],
      _count: {
        id: true
      },
      where: {
        complectator_id: { not: null }
      }
    });

    // Статистика по Исполнителям
    const ordersByExecutor = await prisma.order.groupBy({
      by: ['executor_id'],
      _count: {
        id: true
      },
      where: {
        executor_id: { not: null }
      }
    });

    // Получаем имена Комплектаторов и Исполнителей
    const complectatorIds = ordersByComplectator.map(o => o.complectator_id).filter(Boolean) as string[];
    const executorIds = ordersByExecutor.map(o => o.executor_id).filter(Boolean) as string[];

    const complectators = await prisma.user.findMany({
      where: { id: { in: complectatorIds } },
      select: { id: true, firstName: true, lastName: true, middleName: true }
    });

    const executors = await prisma.user.findMany({
      where: { id: { in: executorIds } },
      select: { id: true, firstName: true, lastName: true, middleName: true }
    });

    const complectatorMap = new Map(complectators.map(c => [c.id, `${c.lastName} ${c.firstName} ${c.middleName || ''}`.trim()]));
    const executorMap = new Map(executors.map(e => [e.id, `${e.lastName} ${e.firstName} ${e.middleName || ''}`.trim()]));

    // Общая статистика
    const totalOrders = await prisma.order.count();
    const paidOrders = await prisma.order.count({ where: { status: 'PAID' } });
    const completedOrders = await prisma.order.count({ where: { status: 'COMPLETED' } });

    const stats = {
      orders: {
        total: totalOrders,
        byStatus: ordersByStatus.map(s => ({
          status: s.status,
          count: s._count.id
        })),
        paid: paidOrders,
        completed: completedOrders
      },
      complectators: ordersByComplectator.map(o => ({
        complectatorId: o.complectator_id,
        complectatorName: complectatorMap.get(o.complectator_id || '') || 'Неизвестно',
        count: o._count.id
      })),
      executors: ordersByExecutor.map(o => ({
        executorId: o.executor_id,
        executorName: executorMap.get(o.executor_id || '') || 'Неизвестно',
        count: o._count.id
      }))
    };

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching manager stats:', error);
    return NextResponse.json(
      { error: 'Ошибка получения статистики' },
      { status: 500 }
    );
  }
}

