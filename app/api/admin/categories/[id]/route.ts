import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===================== Удаление категории =====================

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Не указан ID категории' },
        { status: 400 }
      );
    }

    // Проверяем существование категории
    const category = await prisma.frontendCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    // Удаляем категорию
    await prisma.frontendCategory.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({
      success: true,
      message: 'Категория успешно удалена'
    });

  } catch (error) {
    console.error('Category deletion error:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении категории' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ===================== Обновление категории =====================

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const { 
      name, 
      slug, 
      description, 
      isActive, 
      catalogCategoryIds, 
      propertyMapping, 
      photoMapping, 
      photoData 
    } = await req.json();

    console.log('PUT /api/admin/categories/[id] - Обновление категории:', {
      categoryId,
      hasPhotoMapping: !!photoMapping,
      hasPhotoData: !!photoData,
      photoMappingType: typeof photoMapping,
      photoDataType: typeof photoData
    });

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Не указан ID категории' },
        { status: 400 }
      );
    }

    // Проверяем существование категории
    console.log('Проверяем существование категории:', categoryId);
    const existingCategory = await prisma.frontendCategory.findUnique({
      where: { id: categoryId }
    });

    if (!existingCategory) {
      console.error('Категория не найдена:', categoryId);
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }
    
    console.log('Категория найдена:', {
      id: existingCategory.id,
      name: existingCategory.name,
      slug: existingCategory.slug,
      isActive: existingCategory.is_active
    });

    // Подготавливаем данные для обновления
    const updateData: any = {
      updated_at: new Date() // Всегда обновляем timestamp
    };

    // Добавляем поля только если они переданы (не undefined)
    if (name !== undefined) {
      updateData.name = name;
    }
    if (slug !== undefined) {
      updateData.slug = slug;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    // Добавляем дополнительные поля если они переданы
    if (catalogCategoryIds) {
      updateData.catalog_category_ids = JSON.stringify(catalogCategoryIds);
    }
    
    if (propertyMapping) {
      updateData.property_mapping = JSON.stringify(propertyMapping);
    }
    
    if (photoMapping) {
      console.log('Сохранение УПРОЩЕННОГО photoMapping:', {
        mappingType: photoMapping.mappingType,
        totalFiles: photoMapping.totalFiles,
        mappedCount: photoMapping.mappedCount,
        hasPhotoFiles: !!photoMapping.photoFiles,
        hasMappedPhotos: !!photoMapping.mappedPhotos
      });
      
      try {
        // Сохраняем только минимальные данные - статистику
        const minimalMapping = {
          mappingType: photoMapping.mappingType,
          totalFiles: photoMapping.totalFiles || 0,
          mappedCount: photoMapping.mappedCount || 0,
          savedAt: new Date().toISOString()
        };
        
        const jsonString = JSON.stringify(minimalMapping);
        console.log('Размер УПРОЩЕННОГО photoMapping:', jsonString.length, 'байт');
        
        updateData.photo_mapping = jsonString;
        console.log('Упрощенный photoMapping успешно сохранен');
      } catch (error) {
        console.error('Ошибка сериализации упрощенного photoMapping:', error);
        return NextResponse.json(
          { error: 'Ошибка сериализации данных фотографий' },
          { status: 400 }
        );
      }
    }
    
    if (photoData) {
      console.log('Сохранение photoData:', photoData);
      try {
        updateData.photo_data = JSON.stringify(photoData);
        console.log('photoData успешно сериализован');
      } catch (error) {
        console.error('Ошибка сериализации photoData:', error);
        return NextResponse.json(
          { error: 'Ошибка сериализации данных фотографий' },
          { status: 400 }
        );
      }
    }

    // Обновляем категорию
    console.log('Обновление в БД с данными:', updateData);
    const updatedCategory = await prisma.frontendCategory.update({
      where: { id: categoryId },
      data: updateData
    });
    console.log('Категория успешно обновлена:', updatedCategory.id);

    return NextResponse.json({
      success: true,
      category: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        slug: updatedCategory.slug,
        description: updatedCategory.description,
        isActive: updatedCategory.is_active,
        catalogCategoryIds: JSON.parse(updatedCategory.catalog_category_ids),
        displayConfig: JSON.parse(updatedCategory.display_config),
        createdAt: updatedCategory.created_at,
        updatedAt: updatedCategory.updated_at
      },
      message: 'Категория успешно обновлена'
    });

  } catch (error) {
    console.error('Category update error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении категории' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ===================== Получение категории по ID =====================

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Не указан ID категории' },
        { status: 400 }
      );
    }

    const category = await prisma.frontendCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const formattedCategory = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      isActive: category.is_active,
      catalogCategoryIds: JSON.parse(category.catalog_category_ids),
      displayConfig: JSON.parse(category.display_config),
      productsCount: 0, // Пока не реализовано
      subcategoriesCount: 0, // Пока не реализовано
      configuratorConfig: {},
      pageTemplate: null,
      customLayout: null,
      properties: [],
      importMapping: {},
      createdAt: category.created_at,
      updatedAt: category.updated_at
    };

    return NextResponse.json({
      success: true,
      category: formattedCategory
    });

  } catch (error) {
    console.error('Category fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении категории' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
