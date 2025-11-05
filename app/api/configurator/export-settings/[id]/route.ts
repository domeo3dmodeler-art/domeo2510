import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const setting = await prisma.exportSetting.findUnique({
      where: { id: params.id }
    });

    if (!setting) {
      return NextResponse.json(
        { error: 'Export setting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      setting: {
        ...setting,
        template_config: JSON.parse(setting.template_config)
      }
    });

  } catch (error) {
    console.error('Error fetching export setting:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export setting' },
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
    
    const { name, document_type, template_config } = data;

    const setting = await prisma.exportSetting.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(document_type && { document_type }),
        ...(template_config && { template_config: JSON.stringify(template_config) })
      }
    });

    return NextResponse.json({
      success: true,
      setting: {
        ...setting,
        template_config: JSON.parse(setting.template_config)
      }
    });

  } catch (error) {
    console.error('Error updating export setting:', error);
    return NextResponse.json(
      { error: 'Failed to update export setting' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.exportSetting.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Export setting deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting export setting:', error);
    return NextResponse.json(
      { error: 'Failed to delete export setting' },
      { status: 500 }
    );
  }
}