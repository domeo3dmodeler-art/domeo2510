import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const link = await prisma.categoryLink.findUnique({
      where: { id: params.id },
      include: {
        catalog_category: {
          select: {
            id: true,
            name: true,
            level: true,
            path: true
          }
        },
        configurator_category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Category link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      link
    });

  } catch (error) {
    console.error('Error fetching category link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category link' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    const {
      link_type,
      display_order,
      is_required,
      pricing_type,
      formula,
      export_as_separate
    } = data;

    const link = await prisma.categoryLink.update({
      where: { id: params.id },
      data: {
        ...(link_type && { link_type }),
        ...(display_order !== undefined && { display_order }),
        ...(is_required !== undefined && { is_required }),
        ...(pricing_type && { pricing_type }),
        ...(formula !== undefined && { formula }),
        ...(export_as_separate !== undefined && { export_as_separate })
      },
      include: {
        catalog_category: {
          select: {
            id: true,
            name: true,
            level: true,
            path: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      link
    });

  } catch (error) {
    console.error('Error updating category link:', error);
    return NextResponse.json(
      { error: 'Failed to update category link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.categoryLink.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Category link deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category link:', error);
    return NextResponse.json(
      { error: 'Failed to delete category link' },
      { status: 500 }
    );
  }
}