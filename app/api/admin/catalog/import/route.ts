import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: 'No data found in file' },
        { status: 400 }
      );
    }

    // Ожидаем структуру: id, name, parent_id, level, description
    const categories = data.map((row: any) => ({
      id: row.id || row.ID || '',
      name: row.name || row.Name || row.название || '',
      parentId: row.parent_id || row.parentId || row.parent_ID || null,
      level: parseInt(row.level || row.Level || row.уровень || '1'),
      description: row.description || row.Description || row.описание || '',
      slug: row.slug || row.Slug || '',
      isActive: row.isActive !== false && row.active !== false,
      sortOrder: parseInt(row.sortOrder || row.sort_order || row.порядок || '0')
    })).filter(cat => cat.id && cat.name);

    // Создаем категории каталога
    const createdCategories = [];
    
    for (const category of categories) {
      try {
        const created = await prisma.catalogCategory.create({
          data: {
            id: category.id,
            name: category.name,
            parentId: category.parentId,
            level: category.level,
            description: category.description,
            slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
            isActive: category.isActive,
            sortOrder: category.sortOrder,
            propertiesSchema: JSON.stringify({}), // Пустая схема по умолчанию
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        createdCategories.push(created);
      } catch (error) {
        console.error(`Error creating category ${category.id}:`, error);
        // Продолжаем с другими категориями
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${createdCategories.length} categories`,
      categories: createdCategories,
      total: categories.length,
      imported: createdCategories.length
    });

  } catch (error) {
    console.error('Error importing catalog:', error);
    return NextResponse.json(
      { error: 'Failed to import catalog' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const categories = await prisma.catalogCategory.findMany({
      orderBy: [
        { level: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        children: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: {
            products: true,
            children: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error fetching catalog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    );
  }
}

