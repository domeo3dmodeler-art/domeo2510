import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    const where: any = { clientId: params.id };
    if (type) where.type = type;
    if (status) where.status = status;

    const documents = await prisma.document.findMany({
      where,
        orderBy: { created_at: 'desc' },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
            address: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      documents: documents.map(doc => ({
        ...doc,
        content: JSON.parse(doc.content || '{}'),
        documentData: doc.documentData ? JSON.parse(doc.documentData) : null
      }))
    });

  } catch (error) {
    console.error('Error fetching client documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { type, content, documentData } = data;

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        clientId: params.id,
        type,
        content: JSON.stringify(content),
        documentData: documentData ? JSON.stringify(documentData) : null,
        status: 'draft'
      }
    });

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        content: JSON.parse(document.content || '{}'),
        documentData: document.documentData ? JSON.parse(document.documentData) : null
      }
    });

  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

