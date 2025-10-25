import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configuratorCategoryId = searchParams.get('configuratorCategoryId');

    if (!configuratorCategoryId) {
      return NextResponse.json(
        { error: 'configuratorCategoryId is required' },
        { status: 400 }
      );
    }

    const settings = await prisma.exportSetting.findMany({
      where: { configurator_category_id: configuratorCategoryId },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Error fetching export settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch export settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      configurator_category_id,
      name,
      document_type,
      template_config
    } = data;

    if (!configurator_category_id || !name || !document_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const setting = await prisma.exportSetting.create({
      data: {
        configurator_category_id,
        name,
        document_type,
        template_config: JSON.stringify(template_config || {})
      }
    });

    return NextResponse.json({
      success: true,
      setting
    });

  } catch (error) {
    console.error('Error creating export setting:', error);
    return NextResponse.json(
      { error: 'Failed to create export setting' },
      { status: 500 }
    );
  }
}