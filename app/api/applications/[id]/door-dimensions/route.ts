import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/applications/[id]/door-dimensions - Обновление данных дверей
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { door_dimensions, measurement_done, project_complexity } = body;

    // Проверяем существование заявки
    const application = await prisma.application.findUnique({
      where: { id: params.id }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    // Валидация данных дверей
    if (door_dimensions && !Array.isArray(door_dimensions)) {
      return NextResponse.json(
        { error: 'door_dimensions должен быть массивом' },
        { status: 400 }
      );
    }

    if (door_dimensions) {
      for (const dimension of door_dimensions) {
        if (!dimension.width || !dimension.height || !dimension.quantity) {
          return NextResponse.json(
            { error: 'Каждое измерение двери должно содержать width, height и quantity' },
            { status: 400 }
          );
        }
      }
    }

    // Формируем данные для обновления
    const updateData: any = {};

    if (door_dimensions !== undefined) {
      updateData.door_dimensions = JSON.stringify(door_dimensions);
    }

    if (measurement_done !== undefined) {
      updateData.measurement_done = measurement_done;
    }

    if (project_complexity !== undefined) {
      if (project_complexity && !['SIMPLE', 'COMPLEX'].includes(project_complexity)) {
        return NextResponse.json(
          { error: 'project_complexity должен быть "SIMPLE" или "COMPLEX"' },
          { status: 400 }
        );
      }
      updateData.project_complexity = project_complexity;
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
            total_amount: true,
            cart_data: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      application: {
        ...updatedApplication,
        door_dimensions: updatedApplication.door_dimensions 
          ? JSON.parse(updatedApplication.door_dimensions) 
          : null
      }
    });

  } catch (error) {
    console.error('Error updating door dimensions:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления данных дверей' },
      { status: 500 }
    );
  }
}

