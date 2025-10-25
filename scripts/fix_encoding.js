const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

// Маппинг неправильной кодировки на правильную
const encodingMap = {
  'Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ': 'Современная',
  'ÐÐµÐ¾ÐºÐ»Ð°ÑÑÐ¸ÐºÐ°': 'Неоклассика', 
  'ÐÐ»Ð°ÑÑÐ¸ÐºÐ°': 'Классика',
  'Ð¡ÐºÑÑÑÐ°Ñ': 'Скрытая',
  'ÐÐµÐ¶ÐºÐ¾Ð¼Ð½Ð°ÑÐ½ÑÐµ Ð´Ð²ÐµÑÐ¸': 'Межкомнатные двери',
  'ÐÐÐ¥': 'ПВХ',
  'ÐÐÐ¢': 'ПЭТ',
  'ÐÐ½Ð°Ð¼ÐµÐ»Ñ': 'Эмаль',
  'ÐÐµÐ»ÑÐ¹': 'Белый',
  'ÐÐµÐ¶ÐµÐ²ÑÐ¹': 'Бежевый',
  'Ð¡ÐµÑÑÐ¹': 'Серый'
};

async function fixEncoding() {
  console.log('🔧 Начинаем исправление кодировки...');
  
  try {
    // Получаем все товары с проблемной кодировкой
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { properties_data: { contains: 'Ð¡Ð¾Ð²ÑÐµÐ¼ÐµÐ½Ð½Ð°Ñ' } },
          { properties_data: { contains: 'ÐÐµÐ¾ÐºÐ»Ð°ÑÑÐ¸ÐºÐ°' } },
          { properties_data: { contains: 'ÐÐ»Ð°ÑÑÐ¸ÐºÐ°' } },
          { properties_data: { contains: 'Ð¡ÐºÑÑÑÐ°Ñ' } }
        ]
      },
      select: {
        id: true,
        properties_data: true
      }
    });

    console.log(`📦 Найдено ${products.length} товаров с проблемной кодировкой`);

    let fixedCount = 0;

    for (const product of products) {
      let fixedData = product.properties_data;
      
      // Применяем все исправления кодировки
      for (const [wrong, correct] of Object.entries(encodingMap)) {
        if (fixedData.includes(wrong)) {
          fixedData = fixedData.replace(new RegExp(wrong, 'g'), correct);
        }
      }

      // Если данные изменились, обновляем в БД
      if (fixedData !== product.properties_data) {
        await prisma.product.update({
          where: { id: product.id },
          data: { properties_data: fixedData }
        });
        fixedCount++;
      }
    }

    console.log(`✅ Исправлено ${fixedCount} товаров`);
    
    // Проверяем результат
    const testProducts = await prisma.product.findMany({
      where: {
        properties_data: { contains: 'Современная' }
      },
      take: 5,
      select: {
        id: true,
        properties_data: true
      }
    });

    console.log('🔍 Проверка результата:');
    testProducts.forEach(product => {
      const props = JSON.parse(product.properties_data);
      console.log(`  - Товар ${product.id}: стиль = "${props['Domeo_Стиль Web']}"`);
    });

  } catch (error) {
    console.error('❌ Ошибка при исправлении кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEncoding();
