import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canUserEditClient, canUserDeleteClient } from '@/lib/auth/permissions';
import { isValidInternationalPhone, normalizePhoneForStorage } from '@/lib/utils/phone';
import jwt from 'jsonwebtoken';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Оптимизированный запрос - загружаем только основные данные клиента
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phone: true,
        address: true,
        objectId: true,
        compilationLeadNumber: true,
        customFields: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Получаем заказы клиента (для обратной совместимости)
    const orders = await prisma.order.findMany({
      where: { client_id: id },
      select: { id: true }
    });

    // Сначала получаем счета клиента, чтобы использовать их ID для поиска заказов у поставщика
    // SupplierOrder теперь связан напрямую с Invoice через parent_document_id
    const invoices = await prisma.invoice.findMany({
      where: { client_id: id },
      select: {
        id: true,
        number: true,
        status: true,
        total_amount: true,
        created_at: true,
        due_date: true
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });
    const invoiceIds = invoices.map(inv => inv.id);

    // Загружаем остальные документы
    const [quotes, supplierOrders] = await Promise.all([
      prisma.quote.findMany({
        where: { client_id: id },
        select: {
          id: true,
          number: true,
          status: true,
          total_amount: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }),
      prisma.supplierOrder.findMany({
        where: { 
          // Ищем заказы поставщика через связанные счета клиента
          // SupplierOrder теперь связан напрямую с Invoice через parent_document_id
          parent_document_id: {
            in: invoiceIds
          }
        },
        select: {
          id: true,
          number: true, // Номер заказа у поставщика
          status: true,
          created_at: true,
          supplier_name: true,
          order_date: true,
          expected_date: true,
          total_amount: true, // Общая сумма заказа у поставщика
          parent_document_id: true,
          cart_session_id: true
        },
        orderBy: { created_at: 'desc' },
        take: 10
      })
    ]);

    // Для каждого заказа поставщика ищем связанный счет через логику parent_document_id
    const supplierOrdersWithInvoiceInfo = await Promise.all(
      supplierOrders.map(async (so) => {
        let invoiceInfo = null;
        
        // parent_document_id теперь напрямую указывает на Invoice
        // (SupplierOrder → Invoice, а не SupplierOrder → Order → Invoice)
        if (so.parent_document_id) {
          const invoice = await prisma.invoice.findUnique({
            where: { id: so.parent_document_id },
            select: {
              id: true,
              number: true,
              total_amount: true
            }
          });
          
          if (invoice) {
            invoiceInfo = {
              id: invoice.id,
              number: invoice.number,
              total_amount: invoice.total_amount
            };
          }
        }
        
        // Fallback: ищем счет по cart_session_id (для совместимости со старыми данными)
        if (!invoiceInfo && so.cart_session_id) {
          const invoice = await prisma.invoice.findFirst({
            where: {
              cart_session_id: so.cart_session_id
            },
            select: {
              id: true,
              number: true,
              total_amount: true
            }
          });
          
          if (invoice) {
            invoiceInfo = {
              id: invoice.id,
              number: invoice.number,
              total_amount: invoice.total_amount
            };
          }
        }
        
        return {
          ...so,
          invoiceInfo
        };
      })
    );

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        customFields: JSON.parse(client.customFields || '{}'),
        quotes,
        invoices,
        orders,
        supplierOrders: supplierOrdersWithInvoiceInfo
      }
    });

  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { firstName, lastName, middleName, phone, address, objectId, compilationLeadNumber, customFields, isActive } = data;

    // Получаем пользователя из токена
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars") as any;
    const userRole = decoded.role;

    // Проверяем права на редактирование клиента
    if (!canUserEditClient(userRole)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для редактирования клиента' },
        { status: 403 }
      );
    }

    // Валидация телефона
    if (phone && !isValidInternationalPhone(phone)) {
      return NextResponse.json(
        { error: 'Неверный формат телефона. Используйте международный формат (например: +7 999 123-45-67)' },
        { status: 400 }
      );
    }

    // Нормализуем телефон для хранения
    const normalizedPhone = phone ? normalizePhoneForStorage(phone) : phone;

    const client = await prisma.client.update({
      where: { id },
      data: {
        firstName,
        lastName,
        middleName,
        phone: normalizedPhone,
        address,
        objectId,
        compilationLeadNumber: compilationLeadNumber || null,
        customFields: JSON.stringify(customFields || {}),
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        customFields: JSON.parse(client.customFields || '{}')
      }
    });

  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Получаем пользователя из токена
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars") as any;
    const userRole = decoded.role;

    // Проверяем права на удаление клиента
    if (!canUserDeleteClient(userRole)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления клиента' },
        { status: 403 }
      );
    }

    // Проверяем, что у клиента нет активных документов
    const [activeInvoices, activeQuotes, activeOrders] = await Promise.all([
      prisma.invoice.count({
        where: { 
          client_id: id,
          status: { not: 'CANCELLED' }
        }
      }),
      prisma.quote.count({
        where: { 
          client_id: id,
          status: { not: 'CANCELLED' }
        }
      }),
      prisma.order.count({
        where: { 
          client_id: id,
          status: { not: 'CANCELLED' }
        }
      })
    ]);

    const totalActiveDocuments = activeInvoices + activeQuotes + activeOrders;

    if (totalActiveDocuments > 0) {
      return NextResponse.json(
        { error: `Нельзя удалить клиента с активными документами (Счетов: ${activeInvoices}, КП: ${activeQuotes}, Заказов: ${activeOrders})` },
        { status: 400 }
      );
    }

    await prisma.client.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}

