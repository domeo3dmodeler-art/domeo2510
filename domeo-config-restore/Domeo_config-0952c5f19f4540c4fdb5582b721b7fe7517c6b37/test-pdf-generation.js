const { generatePDFWithPuppeteer } = require('./lib/export/puppeteer-generator');

async function testPDFGeneration() {
  try {
    console.log('🧪 Тестируем генерацию PDF...');
    
    const testData = {
      documentNumber: 'КП-1761195828236',
      clientName: 'Тестовый клиент',
      items: [
        {
          name: 'Дверь DomeoDoors_Base_1',
          unitPrice: 50000,
          quantity: 1,
          total: 50000
        }
      ],
      totalAmount: 50000
    };
    
    console.log('📄 Генерируем PDF с данными:', testData);
    
    const pdfBuffer = await generatePDFWithPuppeteer(testData);
    
    console.log('✅ PDF сгенерирован, размер:', pdfBuffer.length, 'байт');
    
  } catch (error) {
    console.error('❌ Ошибка при генерации PDF:', error);
  }
}

testPDFGeneration();
