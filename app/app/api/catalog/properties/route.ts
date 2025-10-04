import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// GET /api/catalog/properties - Получить все свойства
export async function GET(request: NextRequest) {
  try {
    const properties = await prisma.productProperty.findMany({
      where: {
        is_active: true
      },
      include: {
        category_assignments: {
          include: {
            catalog_category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const formattedProperties = properties.map(property => ({
      id: property.id,
      name: property.name,
      type: property.type,
      description: property.description,
      options: property.options ? JSON.parse(property.options) : null,
      is_required: property.is_required,
      categories: property.category_assignments.map(assignment => ({
        id: assignment.catalog_category_id,
        name: assignment.catalog_category.name,
        is_required: assignment.is_required,
        is_for_calculator: assignment.is_for_calculator,
        is_for_export: assignment.is_for_export
      }))
    }));

    return NextResponse.json({
      success: true,
      properties: formattedProperties
    });

  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryIds } = await request.json();

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json(
        { error: 'Category IDs are required' },
        { status: 400 }
      );
    }

    // Получаем свойства товаров для указанных категорий
    const properties = await prisma.productProperty.findMany({
      where: {
        category_assignments: {
          some: {
            catalog_category_id: { in: categoryIds }
          }
        },
        is_active: true
      },
      include: {
        category_assignments: {
          where: {
            catalog_category_id: { in: categoryIds }
          },
          include: {
            catalog_category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Группируем свойства по категориям
    const propertiesByCategory = categoryIds.reduce((acc, categoryId) => {
      acc[categoryId] = properties.filter(property => 
        property.category_assignments.some(assignment => 
          assignment.catalog_category_id === categoryId
        )
      );
      return acc;
    }, {} as Record<string, any[]>);

    // Формируем список всех уникальных свойств
    const allProperties = properties.map(property => ({
      id: property.id,
      name: property.name,
      type: property.type,
      description: property.description,
      options: property.options ? JSON.parse(property.options) : null,
      is_required: property.is_required,
      categories: property.category_assignments.map(assignment => ({
        id: assignment.catalog_category_id,
        name: assignment.catalog_category.name,
        is_required: assignment.is_required,
        is_for_calculator: assignment.is_for_calculator,
        is_for_export: assignment.is_for_export
      }))
    }));

    return NextResponse.json({
      success: true,
      properties: allProperties,
      propertiesByCategory
    });

  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}