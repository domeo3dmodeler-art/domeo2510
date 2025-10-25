import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/products/category/[categoryId] - Получить товары категории с фильтрами
export async function GET(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = params.categoryId;
    
    // Параметры фильтрации
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const search = searchParams.get('search') || '';
    
    // Фильтры по свойствам (JSON строка)
    const filtersParam = searchParams.get('filters');
    let filters: { [key: string]: any } = {};
    if (filtersParam) {
      try {
        filters = JSON.parse(filtersParam);
      } catch (e) {
        console.warn('Invalid filters parameter:', filtersParam);
      }
    }
    
    // Поля для отображения
    const fieldsParam = searchParams.get('fields');
    let displayFields: string[] = ['id', 'sku', 'name', 'base_price', 'currency'];
    if (fieldsParam) {
      try {
        displayFields = JSON.parse(fieldsParam);
      } catch (e) {
        console.warn('Invalid fields parameter:', fieldsParam);
      }
    }
    
    // Базовый запрос
    const where: any = {
      catalog_category_id: categoryId,
      is_active: true
    };
    
    // Поиск по названию и описанию
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Фильтры по свойствам товара
    if (Object.keys(filters).length > 0) {
      const propertyConditions: any[] = [];
      
      for (const [propertyKey, propertyValue] of Object.entries(filters)) {
        if (propertyValue !== null && propertyValue !== undefined && propertyValue !== '') {
          // Поиск в properties_data JSON
          propertyConditions.push({
            properties_data: {
              path: [propertyKey],
              equals: propertyValue
            }
          });
        }
      }
      
      if (propertyConditions.length > 0) {
        where.AND = propertyConditions;
      }
    }
    
    // Подсчет общего количества
    const totalCount = await prisma.product.count({ where });
    
    // Получение товаров с пагинацией
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        brand: true,
        model: true,
        series: true,
        base_price: true,
        currency: true,
        stock_quantity: true,
        min_order_qty: true,
        weight: true,
        dimensions: true,
        specifications: true,
        properties_data: true,
        tags: true,
        is_active: true,
        is_featured: true,
        created_at: true,
        updated_at: true,
        images: {
          select: {
            id: true,
            url: true,
            alt_text: true,
            is_primary: true,
            sort_order: true
          },
          orderBy: [
            { is_primary: 'desc' },
            { sort_order: 'asc' }
          ]
        }
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    });
    
    // Обработка свойств товаров
    const processedProducts = products.map(product => {
      let propertiesData = {};
      try {
        propertiesData = JSON.parse(product.properties_data || '{}');
      } catch (e) {
        console.warn('Invalid properties_data for product:', product.id);
      }
      
      return {
        ...product,
        properties_data: propertiesData, // Заменяем строку на объект
        properties: propertiesData,
        primaryImage: product.images.find(img => img.is_primary) || product.images[0] || null,
        images: product.images
      };
    });
    
    // Получение доступных свойств для фильтрации
    const availableProperties = await getAvailableProperties(categoryId);
    
    return NextResponse.json({
      success: true,
      data: {
        products: processedProducts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        filters: {
          available: availableProperties,
          applied: filters
        },
        displayFields
      }
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Кэш для свойств
const propertiesCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Функция для получения доступных свойств категории
async function getAvailableProperties(categoryId: string) {
  try {
    console.log('🚀 Loading properties for category:', categoryId);
    
    // Проверяем кэш
    const cached = propertiesCache.get(categoryId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('⚡ Using cached properties:', cached.data.length);
      return cached.data;
    }
    
    // Сначала получаем шаблон (это быстрее чем анализировать товары)
    let templateFieldMappings: any[] = [];
    try {
      const template = await prisma.importTemplate.findFirst({
        where: { catalog_category_id: categoryId },
        select: { field_mappings: true }
      });
      
      if (template?.field_mappings) {
        const fieldMappingsData = typeof template.field_mappings === 'string' 
          ? JSON.parse(template.field_mappings) 
          : template.field_mappings;
        templateFieldMappings = Array.isArray(fieldMappingsData) ? fieldMappingsData : [];
        
        // Если в шаблоне есть fieldMappings, используем их вместо анализа товаров
        if (templateFieldMappings.length > 0) {
          console.log('⚡ Using template field mappings:', templateFieldMappings.length);
          
          const availableProperties = templateFieldMappings
            .filter(mapping => mapping.fieldName && mapping.displayName)
            .map(mapping => ({
              key: mapping.displayName,
              displayName: mapping.displayName,
              type: mapping.dataType || 'select',
              values: [], // Будем загружать значения по требованию
              count: 0
            }));
            
          console.log('✅ Quick template properties loaded:', availableProperties.length);
          
          // Кэшируем результат
          propertiesCache.set(categoryId, {
            data: availableProperties,
            timestamp: Date.now()
          });
          
          return availableProperties;
        }
      }
    } catch (templateError) {
      console.log('No template found, falling back to product analysis');
    }

    // Fallback: анализируем небольшое количество товаров
    console.log('🔍 Analyzing products for properties...');
    const products = await prisma.product.findMany({
      where: {
        catalog_category_id: categoryId,
        is_active: true
      },
      select: { properties_data: true },
      take: 20 // Сильно ограничиваем для скорости
    });

    const propertiesMap = new Map<string, Set<string>>();
    const keyToDisplayNameMap = new Map<string, string>();
    
    // Создаем маппинг из шаблона если есть
    templateFieldMappings.forEach(mapping => {
      if (mapping.fieldName && mapping.displayName) {
        keyToDisplayNameMap.set(mapping.fieldName, mapping.displayName);
      }
    });
    
    // Быстро анализируем товары
    products.forEach(product => {
      try {
        const properties = JSON.parse(product.properties_data || '{}');
        Object.entries(properties).forEach(([key, value]) => {
          const displayKey = keyToDisplayNameMap.get(key) || key;
          
          if (!propertiesMap.has(displayKey)) {
            propertiesMap.set(displayKey, new Set());
          }
          if (value !== null && value !== undefined) {
            propertiesMap.get(displayKey)!.add(String(value));
          }
        });
      } catch (e) {
        // Игнорируем
      }
    });
    
    const availableProperties = Array.from(propertiesMap.entries()).map(([displayName, values]) => ({
      key: displayName,
      displayName: displayName,
      type: 'select',
      values: Array.from(values).sort(),
      count: values.size
    }));
    
    console.log('✅ Product properties analyzed:', availableProperties.length);
    
    // Кэшируем результат
    propertiesCache.set(categoryId, {
      data: availableProperties,
      timestamp: Date.now()
    });
    
    return availableProperties;
    
  } catch (error) {
    console.error('❌ Error getting available properties:', error);
    return [];
  }
}


