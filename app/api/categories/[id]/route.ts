import { NextRequest, NextResponse } from 'next/server';

// Mock данные для демонстрации
const mockCategories = {
  'doors': {
    id: 'doors',
    name: 'Двери',
    description: 'Межкомнатные и входные двери',
    icon: '🚪',
    properties: [
      { key: 'material', name: 'Материал', type: 'select', required: true },
      { key: 'color', name: 'Цвет', type: 'select', required: true },
      { key: 'size', name: 'Размер', type: 'text', required: true },
      { key: 'price', name: 'Цена', type: 'number', required: true }
    ],
    import_mapping: {
      'Material': 'material',
      'Color': 'color',
      'Size': 'size',
      'Price': 'price'
    },
    is_main: true,
    parent_id: null,
    subcategories: [
      {
        id: 'door-handles',
        name: 'Ручки',
        description: 'Ручки для дверей',
        icon: '🔘',
        properties: [],
        import_mapping: {},
        is_main: false,
        parent_id: 'doors'
      },
      {
        id: 'door-kits',
        name: 'Комплекты фурнитуры',
        description: 'Комплекты фурнитуры для дверей',
        icon: '🔧',
        properties: [],
        import_mapping: {},
        is_main: false,
        parent_id: 'doors'
      }
    ]
  }
};

const mockPhotos = {
  'doors': [
    {
      id: '1',
      url: '/assets/doors/door_base_1.jpg',
      alt: 'Дверь PO Base 1/1',
      category_id: 'doors'
    }
  ]
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const category = mockCategories[categoryId as keyof typeof mockCategories];

    if (!category) {
      return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const data = await request.json();

    // В реальном приложении здесь будет обновление в базе данных
    console.log('Updating category:', categoryId, data);

    // Обновляем mock данные
    if (mockCategories[categoryId as keyof typeof mockCategories]) {
      mockCategories[categoryId as keyof typeof mockCategories] = {
        ...mockCategories[categoryId as keyof typeof mockCategories],
        ...data
      };
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
