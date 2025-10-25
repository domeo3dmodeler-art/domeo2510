const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDocumentCreation() {
  try {
    console.log('🧪 Тестируем создание документа...');
    
    // Тестируем создание КП
    const quoteData = {
      number: `КП-${Date.now()}`,
      client_id: 'cmh1gvnq500046z6i6ivwa3os',
      created_by: 'system',
      status: 'DRAFT',
      subtotal: 50000,
      total_amount: 50000,
      currency: 'RUB',
      notes: 'Тестовый КП',
      cart_data: JSON.stringify([{id: 'test', type: 'door', model: 'DomeoDoors_Base_1'}])
    };
    
    console.log('📋 Создаем КП с данными:', quoteData);
    
    const quote = await prisma.quote.create({
      data: quoteData
    });
    
    console.log('✅ КП создан:', quote);
    
    // Тестируем создание счета
    const invoiceData = {
      number: `Счет-${Date.now()}`,
      client_id: 'cmh1gvnq500046z6i6ivwa3os',
      created_by: 'system',
      status: 'DRAFT',
      subtotal: 50000,
      total_amount: 50000,
      currency: 'RUB',
      notes: 'Тестовый счет',
      cart_data: JSON.stringify([{id: 'test', type: 'door', model: 'DomeoDoors_Base_1'}])
    };
    
    console.log('💰 Создаем счет с данными:', invoiceData);
    
    const invoice = await prisma.invoice.create({
      data: invoiceData
    });
    
    console.log('✅ Счет создан:', invoice);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDocumentCreation();
