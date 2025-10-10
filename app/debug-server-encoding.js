// Диагностика кодировки сервера
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugServerEncoding() {
  console.log('🔍 ДИАГНОСТИКА КОДИРОВКИ СЕРВЕРА');
  console.log('=================================\n');

  console.log('📋 Переменные окружения процесса:');
  console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);
  console.log('LANG:', process.env.LANG);
  console.log('LC_ALL:', process.env.LC_ALL);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  console.log('\n🔤 Тест кириллицы в консоли:');
  const testStrings = ['Современная', 'ПВХ', 'Белый', 'Базовый'];
  testStrings.forEach(str => {
    console.log(`${str}:`, str);
  });

  console.log('\n📄 Тест JSON с кириллицей:');
  const testData = {
    style: 'Современная',
    model: 'DomeoDoors_Base_1',
    finish: 'ПВХ',
    color: 'Белый'
  };
  console.log(JSON.stringify(testData, null, 2));

  console.log('\n🔧 Настройки процесса:');
  console.log('platform:', process.platform);
  console.log('arch:', process.arch);
  console.log('version:', process.version);

  console.log('\n📝 Кодировка потоков:');
  console.log('stdout.encoding:', process.stdout.encoding);
  console.log('stderr.encoding:', process.stderr.encoding);

  console.log('\n🗄️ Тест базы данных:');
  try {
    const doorCategory = await prisma.catalogCategory.findFirst({
      where: { name: 'Межкомнатные двери' },
      select: { id: true, name: true },
    });

    if (doorCategory) {
      console.log(`✅ Категория найдена: ${doorCategory.name}`);
      
      const sampleProduct = await prisma.product.findFirst({
        where: { catalog_category_id: doorCategory.id },
        select: { sku: true, properties_data: true },
      });

      if (sampleProduct) {
        const props = typeof sampleProduct.properties_data === 'string' 
          ? JSON.parse(sampleProduct.properties_data) 
          : sampleProduct.properties_data;
        
        console.log('📦 Пример товара:');
        console.log('SKU:', sampleProduct.sku);
        console.log('СТИЛЬ:', props['СТИЛЬ']);
        console.log('МОДЕЛЬ:', props['МОДЕЛЬ']);
        console.log('ТИП ПОКРЫТИЯ:', props['ТИП ПОКРЫТИЯ']);
        console.log('ЦВЕТ_DOMEO:', props['ЦВЕТ_DOMEO']);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка БД:', error.message);
  }

  console.log('\n✅ Диагностика завершена!');
}

debugServerEncoding().finally(() => prisma.$disconnect());
