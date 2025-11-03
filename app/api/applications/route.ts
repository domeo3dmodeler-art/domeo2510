import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Генерация номера заявки
function generateApplicationNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `APP-${timestamp}-${random}`;
}

// POST /api/applications - Создание новой заявки
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoice_id, client_id, lead_number, complectator_id, executor_id } = body;

    if (!client_id) {
      return NextResponse.json(
        { error: 'client_id обязателен' },
        { status: 400 }
      );
    }

    // Проверяем существование клиента
    const client = await prisma.client.findUnique({
      where: { id: client_id }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Клиент не найден' },
        { status: 404 }
      );
    }

    // Если есть invoice_id, проверяем существование счета
    if (invoice_id) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoice_id }
      });

      if (!invoice) {
        return NextResponse.json(
          { error: 'Счет не найден' },
          { status: 404 }
        );
      }

      // Проверяем, что счет уже не связан с другой заявкой
      const existingApplication = await prisma.application.findFirst({
        where: { invoice_id }
      });

      if (existingApplication) {
        return NextResponse.json(
          { error: 'Счет уже связан с другой заявкой' },
          { status: 400 }
        );
      }
    }

    // Генерируем номер заявки
    let applicationNumber = generateApplicationNumber();
    let exists = await prisma.application.findUnique({
      where: { number: applicationNumber }
    });

    // Если номер уже существует, генерируем новый
    while (exists) {
      applicationNumber = generateApplicationNumber();
      exists = await prisma.application.findUnique({
        where: { number: applicationNumber }
      });
    }

    // Создаем заявку
    const application = await prisma.application.create({
      data: {
        number: applicationNumber,
        client_id,
        invoice_id: invoice_id || null,
        lead_number: lead_number || null,
        complectator_id: complectator_id || null,
        executor_id: executor_id || null,
        status: 'NEW_PLANNED'
      },
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
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Ошибка создания заявки' },
      { status: 500 }
    );
  }
}

// GET /api/applications - Получение списка заявок
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const executor_id = searchParams.get('executor_id');
    const client_id = searchParams.get('client_id');

    // Строим фильтр
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (executor_id) {
      where.executor_id = executor_id;
    }

    if (client_id) {
      where.client_id = client_id;
    }

    // Получаем заявки
    const applications = await prisma.application.findMany({
      where,
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
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Получаем информацию о комплектаторах если есть complectator_id
    const complectatorIds = applications
      .map(app => app.complectator_id)
      .filter((id): id is string => id !== null);

    const complectators = complectatorIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: { in: complectatorIds },
            role: 'complectator'
          },
          select: {
            id: true,
            first_name: true,
            last_name: true,
            middle_name: true
          }
        })
      : [];

    const complectatorMap = new Map(
      complectators.map(c => [c.id, `${c.last_name} ${c.first_name.charAt(0)}.${c.middle_name ? c.middle_name.charAt(0) + '.' : ''}`])
    );

    // Форматируем данные заявок
    const formattedApplications = applications.map(app => ({
      id: app.id,
      number: app.number,
      client_id: app.client_id,
      invoice_id: app.invoice_id,
      lead_number: app.lead_number,
      complectator_id: app.complectator_id,
      complectator_name: app.complectator_id ? complectatorMap.get(app.complectator_id) || 'Не указан' : null,
      executor_id: app.executor_id,
      status: app.status,
      project_file_url: app.project_file_url,
      door_dimensions: app.door_dimensions ? JSON.parse(app.door_dimensions) : null,
      measurement_done: app.measurement_done,
      project_complexity: app.project_complexity,
      wholesale_invoices: app.wholesale_invoices ? JSON.parse(app.wholesale_invoices) : [],
      technical_specs: app.technical_specs ? JSON.parse(app.technical_specs) : [],
      verification_status: app.verification_status,
      verification_notes: app.verification_notes,
      notes: app.notes,
      created_at: app.created_at,
      updated_at: app.updated_at,
      client: {
        id: app.client.id,
        firstName: app.client.firstName,
        lastName: app.client.lastName,
        middleName: app.client.middleName,
        phone: app.client.phone,
        address: app.client.address,
        fullName: `${app.client.lastName} ${app.client.firstName}${app.client.middleName ? ' ' + app.client.middleName : ''}`
      },
      invoice: app.invoice
    }));

    return NextResponse.json({
      success: true,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Ошибка получения заявок' },
      { status: 500 }
    );
  }
}

