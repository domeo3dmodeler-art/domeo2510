const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDataQuality() {
  try {
    console.log('🔍 ПРОВЕРКА КАЧЕСТВА ДАННЫХ ПОСЛЕ ИСПРАВЛЕНИЙ\n');

    // Получаем категорию "Межкомнатные двери"
    const category = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' }
    });

    if (!category) {
      console.log('❌ Категория "Межкомнатные двери" не найдена');
      return;
    }

    console.log(`📂 Категория: ${category.name} (ID: ${category.id})\n`);

    // Получаем все товары категории
    const products = await prisma.product.findMany({
      where: { catalog_category_id: category.id },
      select: {
        id: true,
        sku: true,
        name: true,
        properties_data: true,
        base_price: true,
        stock_quantity: true
      }
    });

    console.log(`📦 Всего товаров для анализа: ${products.length}\n`);

    // Статистика по исправлениям
    let encodingIssues = 0;
    let decimalPrices = 0;
    let kromkaCostIssues = 0;
    let kromkaStandardizationIssues = 0;
    let skladCaseIssues = 0;
    let nonStandardWidthIssues = 0;
    let emptyProperties = 0;
    let missingSKU = 0;
    let missingName = 0;

    // Анализируем каждый товар
    products.forEach((product, index) => {
      // Проверяем базовые поля
      if (!product.sku || product.sku.trim() === '') {
        missingSKU++;
      }
      if (!product.name || product.name.trim() === '' || product.name === 'Без названия') {
        missingName++;
      }

      // Парсим свойства товара
      let properties = {};
      if (product.properties_data) {
        try {
          properties = typeof product.properties_data === 'string' 
            ? JSON.parse(product.properties_data) 
            : product.properties_data;
        } catch (e) {
          console.error(`Ошибка парсинга свойств для товара ${product.id}:`, e);
          emptyProperties++;
          return;
        }
      } else {
        emptyProperties++;
        return;
      }

      // Проверяем исправления кодировки
      Object.values(properties).forEach(value => {
        if (typeof value === 'string' && value.includes('?')) {
          encodingIssues++;
        }
      });

      // Проверяем десятичные цены
      if (properties['Цена опт'] && typeof properties['Цена опт'] === 'string') {
        const price = parseFloat(properties['Цена опт']);
        if (!isNaN(price) && price % 1 !== 0) {
          decimalPrices++;
        }
      }

      // Проверяем стоимость надбавки за кромку
      if (properties['Стоимость надбавки за кромку'] === '-') {
        kromkaCostIssues++;
      }

      // Проверяем стандартизацию кромки
      if (properties['Кромка'] === 'Black' || properties['Кромка'] === 'ABS BLACK') {
        kromkaStandardizationIssues++;
      }

      // Проверяем регистр склада
      if (properties['Склад/заказ'] === 'складское') {
        skladCaseIssues++;
      }

      // Проверяем нестандартную ширину
      if (properties['Ширина/мм'] === '400') {
        nonStandardWidthIssues++;
      }
    });

    // Выводим результаты
    console.log('📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ КАЧЕСТВА ДАННЫХ:\n');
    
    console.log('✅ ИСПРАВЛЕНИЯ:');
    console.log(`   - Проблемы с кодировкой: ${encodingIssues} товаров`);
    console.log(`   - Десятичные цены: ${decimalPrices} товаров`);
    console.log(`   - Стоимость надбавки за кромку: ${kromkaCostIssues} товаров`);
    console.log(`   - Стандартизация кромки: ${kromkaStandardizationIssues} товаров`);
    console.log(`   - Регистр склада: ${skladCaseIssues} товаров`);
    console.log(`   - Нестандартная ширина: ${nonStandardWidthIssues} товаров\n`);

    console.log('⚠️  ПРОБЛЕМЫ:');
    console.log(`   - Товары без SKU: ${missingSKU} товаров`);
    console.log(`   - Товары без названия: ${missingName} товаров`);
    console.log(`   - Товары без свойств: ${emptyProperties} товаров\n`);

    // Общая статистика
    const totalIssues = encodingIssues + decimalPrices + kromkaCostIssues + 
                       kromkaStandardizationIssues + skladCaseIssues + nonStandardWidthIssues;
    const totalProblems = missingSKU + missingName + emptyProperties;
    
    console.log('📈 ОБЩАЯ СТАТИСТИКА:');
    console.log(`   - Всего товаров: ${products.length}`);
    console.log(`   - Исправлено проблем: ${totalIssues}`);
    console.log(`   - Осталось проблем: ${totalProblems}`);
    console.log(`   - Процент качества: ${((products.length - totalProblems) / products.length * 100).toFixed(2)}%\n`);

    // Рекомендации
    console.log('💡 РЕКОМЕНДАЦИИ:');
    if (missingSKU > 0) {
      console.log(`   - Исправить ${missingSKU} товаров без SKU`);
    }
    if (missingName > 0) {
      console.log(`   - Исправить ${missingName} товаров без названия`);
    }
    if (emptyProperties > 0) {
      console.log(`   - Проверить ${emptyProperties} товаров без свойств`);
    }
    if (totalIssues > 0) {
      console.log(`   - Повторить исправления для ${totalIssues} товаров`);
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке качества данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDataQuality();
