import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/documents/[id]/comments - Получить комментарии документа
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Получаем комментарии для документа
    const comments = await prisma.documentComment.findMany({
      where: { document_id: id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            role: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/comments - Добавить комментарий
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, user_id } = body;

    if (!text || !user_id) {
      return NextResponse.json(
        { error: 'Text and user_id are required' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли документ
    const document = await prisma.quote.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!document) {
      // Проверяем в таблице invoices
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!invoice) {
        // Проверяем в таблице supplier_orders
        const supplierOrder = await prisma.supplierOrder.findUnique({
          where: { id },
          select: { id: true }
        });

        if (!supplierOrder) {
          return NextResponse.json(
            { error: 'Document not found' },
            { status: 404 }
          );
        }
      }
    }

    // Создаем комментарий
    const comment = await prisma.documentComment.create({
      data: {
        document_id: id,
        user_id,
        text,
        created_at: new Date()
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
