import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fixFieldsEncoding, validateAndFixData, fixFieldEncoding, fixAllEncoding, fixJSONEncoding } from '@/lib/encoding-utils';
import { apiErrorHandler } from '@/lib/api-error-handler';
import { apiValidator } from '@/lib/api-validator';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogCategoryId = searchParams.get('catalogCategoryId');
    
    // Валидация параметров
    apiValidator.validateId(catalogCategoryId!, 'catalogCategoryId');

    // Получаем шаблон для категории
    console.log('🔍 Ищем шаблон для категории:', catalogCategoryId);
    const template = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: catalogCategoryId },
      include: {
        catalog_category: {
          select: { name: true }
        }
      }
    });
    
    console.log('📋 Найденный шаблон:', template ? {
      id: template.id,
      name: template.name,
      required_fields: template.required_fields,
      updated_at: template.updated_at
    } : 'НЕ НАЙДЕН');

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found for this category' }, { status: 404 });
    }

    // Парсим поля шаблона с исправлением кодировки
    let requiredFields = JSON.parse(template.required_fields || '[]');
    let calculatorFields = JSON.parse(template.calculator_fields || '[]');
    let exportFields = JSON.parse(template.export_fields || '[]');
    let templateConfig = JSON.parse(template.template_config || '{}');
    
    // ИСПРАВЛЯЕМ КОДИРОВКУ - Prisma возвращает поврежденные данные
    requiredFields = fixFieldsEncoding(requiredFields);
    calculatorFields = fixFieldsEncoding(calculatorFields);
    exportFields = fixFieldsEncoding(exportFields);
    templateConfig = fixAllEncoding(templateConfig);
    
    // Исправляем название и описание шаблона
    const fixedName = fixFieldEncoding(template.name);
    const fixedDescription = fixFieldEncoding(template.description || '');
    
    console.log('🔍 Поля после исправления кодировки:', requiredFields.slice(0, 3));
    console.log('🔍 Название после исправления:', fixedName);
    console.log('🔍 Описание после исправления:', fixedDescription);

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: fixedName,
        description: fixedDescription,
        catalogCategoryId: template.catalog_category_id,
        catalogCategoryName: template.catalog_category?.name,
        requiredFields,
        calculatorFields,
        exportFields,
        templateConfig,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

  } catch (error) {
    return apiErrorHandler.handle(error, 'templates-get');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      templateId, 
      name, 
      description, 
      requiredFields, 
      calculatorFields, 
      exportFields 
    } = body;

    if (!templateId) {
      return NextResponse.json({ success: false, error: 'templateId is required' }, { status: 400 });
    }

    // Проверяем существование шаблона
    const existingTemplate = await prisma.importTemplate.findUnique({
      where: { id: templateId }
    });

    if (!existingTemplate) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Обновляем конфигурацию шаблона
    const templateConfig = {
      headers: requiredFields,
      requiredFields,
      fieldMappings: {} // Убираем маппинг, поля должны совпадать
    };

    // Валидируем и исправляем данные перед сохранением
    const validatedData = fixAllEncoding({
      name: name || existingTemplate.name,
      description: description || existingTemplate.description,
      requiredFields: fixFieldsEncoding(requiredFields),
      calculatorFields: fixFieldsEncoding(calculatorFields),
      exportFields: fixFieldsEncoding(exportFields),
      templateConfig: {
        headers: fixFieldsEncoding(requiredFields),
        requiredFields: fixFieldsEncoding(requiredFields),
        fieldMappings: {}
      }
    });

    // Обновляем шаблон
    const updatedTemplate = await prisma.importTemplate.update({
      where: { id: templateId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        required_fields: JSON.stringify(validatedData.requiredFields),
        calculator_fields: JSON.stringify(validatedData.calculatorFields),
        export_fields: JSON.stringify(validatedData.exportFields),
        template_config: JSON.stringify(validatedData.templateConfig),
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        requiredFields,
        calculatorFields,
        exportFields,
        updatedAt: updatedTemplate.updated_at
      }
    });

  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      catalogCategoryId, 
      name, 
      description, 
      requiredFields, 
      calculatorFields, 
      exportFields 
    } = body;

    if (!catalogCategoryId) {
      return NextResponse.json({ success: false, error: 'catalogCategoryId is required' }, { status: 400 });
    }

    // Проверяем, не существует ли уже шаблон для этой категории
    const existingTemplate = await prisma.importTemplate.findUnique({
      where: { catalog_category_id: catalogCategoryId }
    });

    if (existingTemplate) {
      return NextResponse.json({ 
        success: false, 
        error: 'Template already exists for this category. Use PUT method to update.' 
      }, { status: 409 });
    }

    // Создаем конфигурацию шаблона
    const templateConfig = {
      headers: requiredFields,
      requiredFields,
      fieldMappings: {} // Убираем маппинг, поля должны совпадать
    };

    // Создаем новый шаблон
    const newTemplate = await prisma.importTemplate.create({
      data: {
        catalog_category_id: catalogCategoryId,
        name: name || 'Шаблон импорта',
        description: description || 'Шаблон для импорта товаров',
        required_fields: JSON.stringify(requiredFields),
        calculator_fields: JSON.stringify(calculatorFields),
        export_fields: JSON.stringify(exportFields),
        template_config: JSON.stringify(templateConfig),
        field_mappings: JSON.stringify({}) // Очищаем маппинг
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template created successfully',
      template: {
        id: newTemplate.id,
        name: newTemplate.name,
        description: newTemplate.description,
        catalogCategoryId: newTemplate.catalog_category_id,
        requiredFields,
        calculatorFields,
        exportFields,
        createdAt: newTemplate.created_at
      }
    });

  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
