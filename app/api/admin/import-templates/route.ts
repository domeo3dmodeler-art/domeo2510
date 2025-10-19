import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fixAllEncoding, fixFieldsEncoding } from '@/lib/encoding-utils';

const prisma = new PrismaClient();

// ===================== Создание шаблона загрузки =====================

export async function POST(req: NextRequest) {
  try {
    const rawData = await req.json();
    
    // Исправляем кодировку входящих данных
    const { 
      name, 
      description, 
      catalog_category_id,
      template_config,
      field_mappings,
      required_fields,
      calculator_fields,
      export_fields,
      validation_rules
    } = fixAllEncoding(rawData);

    if (!name || !catalog_category_id) {
      return NextResponse.json(
        { error: 'Не указаны обязательные поля: name, catalog_category_id' },
        { status: 400 }
      );
    }

    // Проверяем существование категории каталога
    const catalogCategory = await prisma.catalogCategory.findUnique({ 
      where: { id: catalog_category_id } 
    });

    if (!catalogCategory) {
      return NextResponse.json(
        { error: 'Catalog категория не найдена' },
        { status: 404 }
      );
    }

    // Проверяем, существует ли уже шаблон для этой категории
    let importTemplate;
    
    const existingTemplate = await prisma.importTemplate.findUnique({
      where: { catalog_category_id }
    });
    
    if (existingTemplate) {
      // Если шаблон уже существует, НЕ обновляем его - используем существующий
      console.log('Шаблон уже существует для catalog_category, используем существующий:', existingTemplate.id);
      importTemplate = existingTemplate;
    } else {
      // Если шаблона нет, создаем новый
      importTemplate = await prisma.importTemplate.create({
        data: {
          name,
          description: description || '',
          catalog_category_id,
          template_config: template_config ? JSON.stringify(template_config) : '{}',
          field_mappings: field_mappings ? JSON.stringify(field_mappings) : '[]',
          required_fields: required_fields ? JSON.stringify(required_fields) : '[]',
          calculator_fields: calculator_fields ? JSON.stringify(calculator_fields) : '[]',
          export_fields: export_fields ? JSON.stringify(export_fields) : '[]',
          validation_rules: validation_rules ? JSON.stringify(validation_rules) : '{}',
          is_active: true
        }
      });
      console.log('Создан новый шаблон:', importTemplate.id);
    }

    return NextResponse.json({
      success: true,
      template: {
        id: importTemplate.id,
        name: importTemplate.name,
        description: importTemplate.description,
        catalogCategoryId: importTemplate.catalog_category_id,
        templateConfig: JSON.parse(importTemplate.template_config || '{}'),
        fieldMappings: JSON.parse(importTemplate.field_mappings || '[]'),
        requiredFields: JSON.parse(importTemplate.required_fields || '[]'),
        calculatorFields: JSON.parse(importTemplate.calculator_fields || '[]'),
        exportFields: JSON.parse(importTemplate.export_fields || '[]'),
        validationRules: JSON.parse(importTemplate.validation_rules || '{}'),
        isActive: importTemplate.is_active,
        createdAt: importTemplate.created_at,
        updatedAt: importTemplate.updated_at
      },
      message: 'Шаблон загрузки успешно создан'
    });

  } catch (error) {
    console.error('Import template creation error:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании шаблона загрузки' },
      { status: 500 }
    );
  }
}

// ===================== Получение шаблонов загрузки =====================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const catalogCategoryId = searchParams.get('catalog_category_id');

    let whereClause: any = { is_active: true };

    if (catalogCategoryId) {
      whereClause.catalog_category_id = catalogCategoryId;
    }

    const templates = await prisma.importTemplate.findMany({
      where: whereClause,
      include: {
        catalog_category: {
          select: {
            id: true,
            name: true,
            path: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      catalogCategory: template.catalog_category ? {
        id: template.catalog_category.id,
        name: template.catalog_category.name,
        path: template.catalog_category.path
      } : null,
      templateConfig: (() => {
        if (typeof template.template_config === 'string') {
          try {
            const parsed = JSON.parse(template.template_config);
            return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          } catch {
            return {};
          }
        }
        return template.template_config || {};
      })(),
      fieldMappings: (() => {
        if (typeof template.field_mappings === 'string') {
          try {
            const parsed = JSON.parse(template.field_mappings);
            return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          } catch {
            return [];
          }
        }
        return template.field_mappings || [];
      })(),
      requiredFields: (() => {
        if (typeof template.required_fields === 'string') {
          try {
            const parsed = JSON.parse(template.required_fields);
            return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          } catch {
            return [];
          }
        }
        return template.required_fields || [];
      })(),
      calculatorFields: (() => {
        if (typeof template.calculator_fields === 'string') {
          try {
            const parsed = JSON.parse(template.calculator_fields);
            return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          } catch {
            return [];
          }
        }
        return template.calculator_fields || [];
      })(),
      exportFields: (() => {
        if (typeof template.export_fields === 'string') {
          try {
            const parsed = JSON.parse(template.export_fields);
            return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          } catch {
            return [];
          }
        }
        return template.export_fields || [];
      })(),
      validationRules: (() => {
        if (typeof template.validation_rules === 'string') {
          try {
            const parsed = JSON.parse(template.validation_rules);
            return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
          } catch {
            return {};
          }
        }
        return template.validation_rules || {};
      })(),
      isActive: template.is_active,
      createdAt: template.created_at,
      updatedAt: template.updated_at
    }));

    return NextResponse.json({
      success: true,
      templates: formattedTemplates,
      count: formattedTemplates.length
    });

  } catch (error) {
    console.error('Import templates fetch error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении шаблонов загрузки' },
      { status: 500 }
    );
  }
}
