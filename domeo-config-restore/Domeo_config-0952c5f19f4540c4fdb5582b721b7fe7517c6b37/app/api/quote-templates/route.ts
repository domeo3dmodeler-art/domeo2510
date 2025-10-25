// api/quote-templates/route.ts
// API роут для работы с шаблонами КП

import { NextRequest, NextResponse } from 'next/server';
import { quoteTemplateService } from '@/lib/templates/quote-templates';

// GET /api/quote-templates - Получить все шаблоны
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let templates;
    if (category) {
      templates = quoteTemplateService.getTemplatesByCategory(category);
    } else {
      templates = quoteTemplateService.getAllTemplates();
    }

    return NextResponse.json({
      success: true,
      templates,
      categories: quoteTemplateService.getCategories(),
      stats: quoteTemplateService.getTemplateStats()
    });

  } catch (error: any) {
    console.error('Error fetching quote templates:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении шаблонов КП' },
      { status: 500 }
    );
  }
}

// POST /api/quote-templates - Создать новый шаблон
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Валидация обязательных полей
    if (!body.name || !body.template) {
      return NextResponse.json(
        { error: 'Название и шаблон обязательны' },
        { status: 400 }
      );
    }

    const template = quoteTemplateService.addTemplate({
      name: body.name,
      description: body.description || '',
      category: body.category || 'custom',
      template: body.template
    });

    return NextResponse.json({
      success: true,
      template
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating quote template:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании шаблона КП' },
      { status: 500 }
    );
  }
}
