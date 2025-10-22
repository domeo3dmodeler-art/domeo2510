const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🌱 Создаем тестовые данные для калькулятора...\n');
    
    // Создаем категории дверей
    console.log('📁 Создаем категории...');
    
    const modernCategory = await prisma.catalogCategory.create({
      data: {
        name: 'Современные двери',
        level: 0,
        path: 'modern',
        sort_order: 1,
        is_active: true,
        products_count: 0
      }
    });
    
    const classicCategory = await prisma.catalogCategory.create({
      data: {
        name: 'Классические двери',
        level: 0,
        path: 'classic',
        sort_order: 2,
        is_active: true,
        products_count: 0
      }
    });
    
    console.log(`✅ Создана категория: ${modernCategory.name} (ID: ${modernCategory.id})`);
    console.log(`✅ Создана категория: ${classicCategory.name} (ID: ${classicCategory.id})\n`);
    
    // Создаем фронтенд категории
    console.log('🎨 Создаем фронтенд категории...');
    
    const frontendModern = await prisma.frontendCategory.create({
      data: {
        name: 'Современная',
        slug: 'modern',
        description: 'Современные двери в минималистичном стиле',
        icon: 'modern',
        catalog_category_ids: JSON.stringify([modernCategory.id]),
        display_config: JSON.stringify({
          showStyle: true,
          showModel: true,
          showColor: true,
          showDimensions: true
        }),
        is_active: true
      }
    });
    
    const frontendClassic = await prisma.frontendCategory.create({
      data: {
        name: 'Классическая',
        slug: 'classic',
        description: 'Классические двери в традиционном стиле',
        icon: 'classic',
        catalog_category_ids: JSON.stringify([classicCategory.id]),
        display_config: JSON.stringify({
          showStyle: true,
          showModel: true,
          showColor: true,
          showDimensions: true
        }),
        is_active: true
      }
    });
    
    console.log(`✅ Создана фронтенд категория: ${frontendModern.name}`);
    console.log(`✅ Создана фронтенд категория: ${frontendClassic.name}\n`);
    
    // Создаем тестовые товары
    console.log('🚪 Создаем тестовые товары...');
    
    const testProducts = [
      {
        catalog_category_id: modernCategory.id,
        sku: 'DOOR-MOD-001',
        name: 'Дверь современная "Минимализм"',
        description: 'Современная дверь в минималистичном стиле',
        brand: 'Domeo',
        model: 'Минимализм',
        series: 'Modern',
        base_price: 25000,
        properties_data: JSON.stringify({
          'Стиль': 'Современная',
          'Модель': 'Минимализм',
          'Покрытие': 'Эмаль',
          'Цвет': 'Белый',
          'Ширина': '800',
          'Высота': '2000',
          'Толщина': '40'
        }),
        is_active: true
      },
      {
        catalog_category_id: modernCategory.id,
        sku: 'DOOR-MOD-002',
        name: 'Дверь современная "Геометрия"',
        description: 'Современная дверь с геометрическими элементами',
        brand: 'Domeo',
        model: 'Геометрия',
        series: 'Modern',
        base_price: 28000,
        properties_data: JSON.stringify({
          'Стиль': 'Современная',
          'Модель': 'Геометрия',
          'Покрытие': 'Шпон',
          'Цвет': 'Дуб',
          'Ширина': '800',
          'Высота': '2000',
          'Толщина': '40'
        }),
        is_active: true
      },
      {
        catalog_category_id: classicCategory.id,
        sku: 'DOOR-CLASSIC-001',
        name: 'Дверь классическая "Аристократ"',
        description: 'Классическая дверь с резными элементами',
        brand: 'Domeo',
        model: 'Аристократ',
        series: 'Classic',
        base_price: 35000,
        properties_data: JSON.stringify({
          'Стиль': 'Классическая',
          'Модель': 'Аристократ',
          'Покрытие': 'Шпон',
          'Цвет': 'Орех',
          'Ширина': '800',
          'Высота': '2000',
          'Толщина': '45'
        }),
        is_active: true
      },
      {
        catalog_category_id: classicCategory.id,
        sku: 'DOOR-CLASSIC-002',
        name: 'Дверь классическая "Виктория"',
        description: 'Классическая дверь в английском стиле',
        brand: 'Domeo',
        model: 'Виктория',
        series: 'Classic',
        base_price: 32000,
        properties_data: JSON.stringify({
          'Стиль': 'Классическая',
          'Модель': 'Виктория',
          'Покрытие': 'Эмаль',
          'Цвет': 'Кремовый',
          'Ширина': '800',
          'Высота': '2000',
          'Толщина': '45'
        }),
        is_active: true
      }
    ];
    
    for (const productData of testProducts) {
      const product = await prisma.product.create({
        data: productData
      });
      console.log(`✅ Создан товар: ${product.name} (${product.sku}) - ${product.base_price} руб`);
    }
    
    // Обновляем счетчики товаров в категориях
    await prisma.catalogCategory.update({
      where: { id: modernCategory.id },
      data: { products_count: 2 }
    });
    
    await prisma.catalogCategory.update({
      where: { id: classicCategory.id },
      data: { products_count: 2 }
    });
    
    console.log('\n🎉 Тестовые данные успешно созданы!');
    console.log('\n📊 Итоговая статистика:');
    console.log(`  Категории каталога: 2`);
    console.log(`  Фронтенд категории: 2`);
    console.log(`  Товары: 4`);
    console.log('\n🚪 Теперь калькулятор должен работать!');
    
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();