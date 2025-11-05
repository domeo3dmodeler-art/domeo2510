const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUniqueSkusCorrectly() {
  try {
    console.log('🚀 Создаем уникальные SKU с правильной проверкой...');
    
    // Получаем все товары из категории "Межкомнатные двери"
    const products = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        }
      },
      select: {
        id: true,
        sku: true,
        properties_data: true
      }
    });
    
    console.log(`📦 Найдено ${products.length} товаров для обработки`);
    
    // Получаем ВСЕ существующие SKU из базы данных
    const allExistingSkus = await prisma.product.findMany({
      select: {
        sku: true
      }
    });
    
    const existingSkuSet = new Set(allExistingSkus.map(p => p.sku));
    console.log(`🔍 Найдено ${existingSkuSet.size} существующих SKU в БД`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const newSkuMap = new Map(); // Для отслеживания новых SKU в этой сессии
    
    for (const product of products) {
      try {
        // Парсим properties_data
        let properties = {};
        if (product.properties_data) {
          try {
            properties = typeof product.properties_data === 'string' 
              ? JSON.parse(product.properties_data) 
              : product.properties_data;
          } catch (e) {
            console.log(`⚠️ Ошибка парсинга properties_data для товара ${product.id}`);
            continue;
          }
        }
        
        // Извлекаем компоненты для нового SKU
        const model = properties['Domeo_Название модели для Web'] || 'UNKNOWN_MODEL';
        const width = properties['Ширина/мм'] || 'UNKNOWN_WIDTH';
        const height = properties['Высота/мм'] || 'UNKNOWN_HEIGHT';
        const finish = properties['Общее_Тип покрытия'] || 'UNKNOWN_FINISH';
        const color = properties['Domeo_Цвет'] || 'UNKNOWN_COLOR';
        
        const size = `${width}x${height}`;
        
        // Создаем базовый SKU без номера
        const baseSku = `${model}-${size}-${finish}-${color}`;
        
        // Проверяем уникальность и добавляем номер
        let finalSku;
        let counter = 1;
        finalSku = `${baseSku}-${String(counter).padStart(3, '0')}`;
        
        // Проверяем уникальность против ВСЕХ существующих SKU
        while (existingSkuSet.has(finalSku) || newSkuMap.has(finalSku)) {
          counter++;
          finalSku = `${baseSku}-${String(counter).padStart(3, '0')}`;
          
          // Защита от бесконечного цикла
          if (counter > 999) {
            throw new Error(`Не удалось создать уникальный SKU для ${baseSku} после 999 попыток`);
          }
        }
        
        // Добавляем в карту новых SKU
        newSkuMap.set(finalSku, product.id);
        
        // Обновляем SKU
        await prisma.product.update({
          where: { id: product.id },
          data: { 
            sku: finalSku,
            updated_at: new Date()
          }
        });
        
        console.log(`✅ Обновлен SKU для товара ${product.id}: "${product.sku}" → "${finalSku}"`);
        fixedCount++;
        
      } catch (error) {
        const errorMsg = `Ошибка обработки товара ${product.id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log('\n📊 Результаты создания уникальных SKU:');
    console.log(`✅ Исправлено: ${fixedCount} товаров`);
    console.log(`⏭️ Пропущено: ${skippedCount} товаров`);
    console.log(`❌ Ошибок: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Список ошибок:');
      errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      if (errors.length > 10) {
        console.log(`... и еще ${errors.length - 10} ошибок`);
      }
    }
    
    // Проверяем результат - проверяем уникальность всех SKU
    console.log('\n🔍 Проверка уникальности всех SKU в БД:');
    
    const allSkusAfter = await prisma.product.findMany({
      select: {
        sku: true
      }
    });
    
    const skuCounts = {};
    allSkusAfter.forEach(product => {
      skuCounts[product.sku] = (skuCounts[product.sku] || 0) + 1;
    });
    
    const duplicates = Object.entries(skuCounts).filter(([sku, count]) => count > 1);
    
    console.log(`📊 Всего SKU в БД: ${Object.keys(skuCounts).length}`);
    console.log(`📊 Дубликатов: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️ Найдены дубликаты SKU:');
      duplicates.slice(0, 10).forEach(([sku, count]) => {
        console.log(`  - "${sku}": ${count} товаров`);
      });
    } else {
      console.log('✅ Все SKU в БД уникальны!');
    }
    
    // Статистика по новому формату
    const newFormatProducts = await prisma.product.findMany({
      where: {
        catalog_category: {
          name: 'Межкомнатные двери'
        },
        sku: {
          contains: '-' // Новый формат содержит дефисы
        }
      },
      select: {
        sku: true
      }
    });
    
    console.log('\n📈 Статистика по новому формату SKU:');
    console.log(`📊 Товаров с новым форматом: ${newFormatProducts.length}`);
    
    const formatStats = new Map();
    newFormatProducts.forEach(product => {
      const parts = product.sku.split('-');
      if (parts.length >= 5) {
        const baseFormat = parts.slice(0, 4).join('-');
        formatStats.set(baseFormat, (formatStats.get(baseFormat) || 0) + 1);
      }
    });
    
    console.log(`📊 Уникальных базовых комбинаций: ${formatStats.size}`);
    console.log('\n🔝 Топ-10 комбинаций:');
    Array.from(formatStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([format, count], index) => {
        console.log(`  ${index + 1}. ${format}: ${count} товаров`);
      });
    
    console.log('\n🎉 Создание уникальных SKU завершено!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUniqueSkusCorrectly();
