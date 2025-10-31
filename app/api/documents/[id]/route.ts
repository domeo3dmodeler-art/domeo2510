import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canUserPerformAction } from '@/lib/auth/permissions';
import jwt from 'jsonwebtoken';

// GET /api/documents/[id] - Получение документа по ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    console.log(`📄 Получение документа ${id}`);

    // Получаем пользователя из токена
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars") as any;
    const userId = decoded.userId;
    const userRole = decoded.role;

    // Ищем документ в разных таблицах
    let document = null;
    let documentType = null;

    // Проверяем в таблице quotes
    const quote = await prisma.quote.findUnique({
      where: { id },
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
        quote_items: true
      }
    });

    if (quote) {
      document = quote;
      documentType = 'quote';
    } else {
      // Проверяем в таблице invoices
      const invoice = await prisma.invoice.findUnique({
        where: { id },
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
          invoice_items: true
        }
      });

      if (invoice) {
        document = invoice;
        documentType = 'invoice';
      } else {
        // Проверяем в таблице orders
        const order = await prisma.order.findUnique({
          where: { id },
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
            order_items: true
          }
        });

        if (order) {
          document = order;
          documentType = 'order';
        } else {
          // Проверяем в таблице supplierOrders
          // SupplierOrder не имеет прямой связи с client, получаем через Invoice
          const supplierOrder = await prisma.supplierOrder.findUnique({
            where: { id },
            include: {
              supplier_order_items: true
            }
          });

          if (supplierOrder) {
            // Получаем клиента через связанный Invoice
            let client = null;
            if (supplierOrder.parent_document_id) {
              const invoice = await prisma.invoice.findUnique({
                where: { id: supplierOrder.parent_document_id },
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
                  }
                }
              });
              
              if (invoice && invoice.client) {
                client = invoice.client;
              }
            }
            
            // Добавляем клиента к документу
            document = {
              ...supplierOrder,
              client
            };
            documentType = 'supplier_order';
          }
        }
      }
    }

    if (!document) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }

    // Проверяем права доступа
    const permissionMap = {
      'quote': 'quotes.read',
      'invoice': 'invoices.read', 
      'order': 'orders.read',
      'supplier_order': 'supplier_orders.read'
    };
    
    const requiredPermission = permissionMap[documentType as keyof typeof permissionMap];
    if (!requiredPermission) {
      return NextResponse.json(
        { error: 'Неизвестный тип документа' },
        { status: 400 }
      );
    }

    // Проверяем права через canUserPerformAction с правильным разрешением
    if (!canUserPerformAction(userRole, requiredPermission)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для просмотра документа' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        type: documentType,
        totalAmount: document.total_amount, // Преобразуем total_amount в totalAmount
        createdAt: document.created_at, // Преобразуем created_at в createdAt
        updatedAt: document.updated_at, // Преобразуем updated_at в updatedAt
        content: document.content ? JSON.parse(document.content) : null,
        documentData: document.documentData ? JSON.parse(document.documentData) : null
      }
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении документа' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Удаление документа
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    console.log(`🗑️ Удаление документа ${id}`);

    // Получаем пользователя из токена
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId;
    const userRole = decoded.role;

    // Ищем документ в разных таблицах
    let document = null;
    let documentType = null;

    // Проверяем в таблице счетов
    const invoice = await prisma.invoice.findUnique({
      where: { id }
    });

    if (invoice) {
      document = invoice;
      documentType = 'invoice';
    } else {
      // Проверяем в таблице КП
      const quote = await prisma.quote.findUnique({
        where: { id }
      });

      if (quote) {
        document = quote;
        documentType = 'quote';
      } else {
        // Проверяем в таблице заказов
        const order = await prisma.order.findUnique({
          where: { id }
        });

        if (order) {
          document = order;
          documentType = 'order';
        } else {
          // Проверяем в таблице заказов поставщиков
          const supplierOrder = await prisma.supplierOrder.findUnique({
            where: { id }
          });

          if (supplierOrder) {
            document = supplierOrder;
            documentType = 'supplier_order';
          }
        }
      }
    }

    if (!document) {
      console.log(`❌ Документ с ID ${id} не найден`);
      return NextResponse.json(
        { error: 'Документ не найден' },
        { status: 404 }
      );
    }

    // Проверяем возможность удаления по статусу
    if (!canDeleteDocument(documentType, document.status)) {
      return NextResponse.json(
        { 
          error: 'Документ нельзя удалить в текущем статусе',
          details: {
            currentStatus: document.status,
            documentType: documentType
          }
        },
        { status: 400 }
      );
    }

    // Проверяем права на удаление (включая авторство)
    if (!canUserPerformAction(userRole, 'DELETE', documentType, document.status, document.created_by, userId)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления документа' },
        { status: 403 }
      );
    }

    // Проверяем наличие дочерних документов
    let hasChildren = false;
    if (documentType === 'quote') {
      const childInvoices = await prisma.invoice.count({
        where: { parent_document_id: id }
      });
      hasChildren = childInvoices > 0;
    } else if (documentType === 'invoice') {
      const childOrders = await prisma.order.count({
        where: { parent_document_id: id }
      });
      hasChildren = childOrders > 0;
    } else if (documentType === 'order') {
      const childSupplierOrders = await prisma.supplierOrder.count({
        where: { parent_document_id: id }
      });
      hasChildren = childSupplierOrders > 0;
    }

    if (hasChildren) {
      return NextResponse.json(
        { error: 'Нельзя удалить документ, у которого есть дочерние документы' },
        { status: 400 }
      );
    }

    // Удаляем документ
    let deletedDocument;
    if (documentType === 'invoice') {
      deletedDocument = await prisma.invoice.delete({
        where: { id }
      });
    } else if (documentType === 'quote') {
      deletedDocument = await prisma.quote.delete({
        where: { id }
      });
    } else if (documentType === 'order') {
      deletedDocument = await prisma.order.delete({
        where: { id }
      });
    } else if (documentType === 'supplier_order') {
      deletedDocument = await prisma.supplierOrder.delete({
        where: { id }
      });
    }

    console.log(`✅ Документ ${id} удален пользователем ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Документ успешно удален',
      document: deletedDocument
    });

  } catch (error) {
    console.error('❌ Ошибка удаления документа:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении документа' },
      { status: 500 }
    );
  }
}