import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/applications/[id] - Получение заявки по ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            address: true,
            objectId: true,
            compilationLeadNumber: true
          }
        },
        invoice: {
          select: {
            id: true,
            number: true,
            status: true,
            total_amount: true,
            cart_data: true,
            created_at: true
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    // Получаем информацию о комплектаторе если есть
    let complectator_name = null;
    if (application.complectator_id) {
      const complectator = await prisma.user.findUnique({
        where: { id: application.complectator_id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          middle_name: true
        }
      });

      if (complectator) {
        complectator_name = `${complectator.last_name} ${complectator.first_name.charAt(0)}.${complectator.middle_name ? complectator.middle_name.charAt(0) + '.' : ''}`;
      }
    }

    // Форматируем данные
    const formattedApplication = {
      id: application.id,
      number: application.number,
      client_id: application.client_id,
      invoice_id: application.invoice_id,
      lead_number: application.lead_number,
      complectator_id: application.complectator_id,
      complectator_name,
      executor_id: application.executor_id,
      status: application.status,
      project_file_url: application.project_file_url,
      door_dimensions: application.door_dimensions ? JSON.parse(application.door_dimensions) : null,
      measurement_done: application.measurement_done,
      project_complexity: application.project_complexity,
      wholesale_invoices: application.wholesale_invoices ? JSON.parse(application.wholesale_invoices) : [],
      technical_specs: application.technical_specs ? JSON.parse(application.technical_specs) : [],
      verification_status: application.verification_status,
      verification_notes: application.verification_notes,
      notes: application.notes,
      created_at: application.created_at,
      updated_at: application.updated_at,
      client: {
        id: application.client.id,
        firstName: application.client.firstName,
        lastName: application.client.lastName,
        middleName: application.client.middleName,
        phone: application.client.phone,
        address: application.client.address,
        objectId: application.client.objectId,
        compilationLeadNumber: application.client.compilationLeadNumber,
        fullName: `${application.client.lastName} ${application.client.firstName}${application.client.middleName ? ' ' + application.client.middleName : ''}`
      },
      invoice: application.invoice ? {
        ...application.invoice,
        cart_data: application.invoice.cart_data ? JSON.parse(application.invoice.cart_data) : null
      } : null
    };

    return NextResponse.json({
      success: true,
      application: formattedApplication
    });

  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Ошибка получения заявки' },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id] - Обновление заявки
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      status,
      project_file_url,
      door_dimensions,
      measurement_done,
      project_complexity,
      wholesale_invoices,
      technical_specs,
      verification_status,
      verification_notes,
      notes,
      executor_id
    } = body;

    // Проверяем существование заявки
    const existingApplication = await prisma.application.findUnique({
      where: { id: params.id }
    });

    if (!existingApplication) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    // Валидация переходов статусов
    if (status && status !== existingApplication.status) {
      // Проверяем обязательность загрузки проекта при переходе в UNDER_REVIEW
      if (status === 'UNDER_REVIEW' && !existingApplication.project_file_url && !project_file_url) {
        return NextResponse.json(
          { error: 'Для перехода в статус "На проверке" требуется загрузить проект/планировку' },
          { status: 400 }
        );
      }

      // Проверяем валидность перехода
      const validTransitions: Record<string, string[]> = {
        'NEW_PLANNED': ['UNDER_REVIEW'],
        'UNDER_REVIEW': ['AWAITING_MEASUREMENT', 'AWAITING_INVOICE'],
        'AWAITING_MEASUREMENT': ['AWAITING_INVOICE'],
        'AWAITING_INVOICE': ['COMPLETED'],
        'COMPLETED': []
      };

      const allowedStatuses = validTransitions[existingApplication.status] || [];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Недопустимый переход статуса из ${existingApplication.status} в ${status}` },
          { status: 400 }
        );
      }
    }

    // Формируем данные для обновления
    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (project_file_url !== undefined) updateData.project_file_url = project_file_url;
    if (door_dimensions !== undefined) updateData.door_dimensions = JSON.stringify(door_dimensions);
    if (measurement_done !== undefined) updateData.measurement_done = measurement_done;
    if (project_complexity !== undefined) updateData.project_complexity = project_complexity;
    if (wholesale_invoices !== undefined) updateData.wholesale_invoices = JSON.stringify(wholesale_invoices);
    if (technical_specs !== undefined) updateData.technical_specs = JSON.stringify(technical_specs);
    if (verification_status !== undefined) updateData.verification_status = verification_status;
    if (verification_notes !== undefined) updateData.verification_notes = verification_notes;
    if (notes !== undefined) updateData.notes = notes;
    if (executor_id !== undefined) updateData.executor_id = executor_id;

    // Обновляем заявку
    const application = await prisma.application.update({
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

    return NextResponse.json({
      success: true,
      application
    });

  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления заявки' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Удаление заявки
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Заявка не найдена' },
        { status: 404 }
      );
    }

    await prisma.application.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Заявка удалена'
    });

  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления заявки' },
      { status: 500 }
    );
  }
}

