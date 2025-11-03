import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/applications/[id]/status - Изменение статуса заявки
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, notes, require_measurement } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'status обязателен' },
        { status: 400 }
      );
    }

    // Получаем текущую заявку
    const application = await prisma.application.findUnique({
      where: { id: params.id }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    // Валидация переходов статусов
    const validTransitions: Record<string, string[]> = {
      'NEW_PLANNED': ['UNDER_REVIEW'],
      'UNDER_REVIEW': ['AWAITING_MEASUREMENT', 'AWAITING_INVOICE'],
      'AWAITING_MEASUREMENT': ['AWAITING_INVOICE'],
      'AWAITING_INVOICE': ['COMPLETED'],
      'COMPLETED': []
    };

    const allowedStatuses = validTransitions[application.status] || [];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Недопустимый переход статуса из ${application.status} в ${status}` },
        { status: 400 }
      );
    }

    // Проверяем обязательность загрузки проекта при переходе в UNDER_REVIEW
    if (status === 'UNDER_REVIEW' && !application.project_file_url) {
      return NextResponse.json(
        { error: 'Для перехода в статус "На проверке" требуется загрузить проект/планировку' },
        { status: 400 }
      );
    }

    // Если текущий статус UNDER_REVIEW и переходим в UNDER_REVIEW с require_measurement,
    // определяем следующий статус на основе require_measurement
    let targetStatus = status;
    if (application.status === 'UNDER_REVIEW' && status === 'UNDER_REVIEW' && require_measurement !== undefined) {
      targetStatus = require_measurement ? 'AWAITING_MEASUREMENT' : 'AWAITING_INVOICE';
    }

    // Формируем данные для обновления
    const updateData: any = {
      status: targetStatus
    };

    if (notes) {
      updateData.notes = notes;
    }

    // Обновляем заявку
    const updatedApplication = await prisma.application.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            address: true
          }
        },
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
            total_amount: true
          }
        }
      }
    });

    // TODO: Логирование изменения статуса в DocumentHistory

    return NextResponse.json({
      success: true,
      application: updatedApplication
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: 'Ошибка изменения статуса заявки' },
      { status: 500 }
    );
  }
}

