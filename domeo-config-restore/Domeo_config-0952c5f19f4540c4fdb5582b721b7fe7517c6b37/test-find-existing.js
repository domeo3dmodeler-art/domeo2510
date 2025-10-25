const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFindExistingDocument() {
  try {
    console.log('🔍 Тестируем поиск существующих документов...');
    
    const clientId = 'cmh1gvnq500046z6i6ivwa3os';
    const totalAmount = 50000;
    const items = [{id: 'test', type: 'door', model: 'DomeoDoors_Base_1', qty: 1, unitPrice: 50000}];
    
    // Тестируем поиск КП
    console.log('📋 Ищем существующие КП...');
    const existingQuote = await prisma.quote.findFirst({
      where: {
        parent_document_id: null,
        cart_session_id: null,
        client_id: clientId,
        total_amount: totalAmount
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (existingQuote) {
      console.log('✅ Найден существующий КП:', existingQuote.number);
    } else {
      console.log('❌ Существующий КП не найден');
    }
    
    // Тестируем поиск счета
    console.log('💰 Ищем существующие счета...');
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        parent_document_id: null,
        cart_session_id: null,
        client_id: clientId,
        total_amount: totalAmount
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    if (existingInvoice) {
      console.log('✅ Найден существующий счет:', existingInvoice.number);
    } else {
      console.log('❌ Существующий счет не найден');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFindExistingDocument();
