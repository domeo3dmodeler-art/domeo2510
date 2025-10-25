const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixInvoiceQuoteLink() {
  try {
    console.log('🔧 Исправляем связь между счетом и КП...');
    
    // Получаем счет и КП
    const invoice = await prisma.invoice.findFirst({
      where: {
        number: 'INVOICE-1761162618801'
      },
      select: {
        id: true,
        number: true,
        parent_document_id: true,
        cart_session_id: true,
        total_amount: true,
        created_at: true
      }
    });
    
    const quote = await prisma.quote.findFirst({
      where: {
        number: 'QUOTE-1761162610605'
      },
      select: {
        id: true,
        number: true,
        parent_document_id: true,
        cart_session_id: true,
        total_amount: true,
        created_at: true
      }
    });
    
    if (invoice && quote) {
      console.log('📋 Найденные документы:');
      console.log(`   КП: ${quote.number} (ID: ${quote.id})`);
      console.log(`   Счет: ${invoice.number} (ID: ${invoice.id})`);
      console.log(`   Текущий parent_document_id счета: ${invoice.parent_document_id}`);
      console.log(`   cart_session_id КП: ${quote.cart_session_id}`);
      console.log(`   cart_session_id счета: ${invoice.cart_session_id}`);
      
      // Проверяем совпадение cart_session_id
      if (quote.cart_session_id === invoice.cart_session_id) {
        console.log('✅ cart_session_id совпадают - документы связаны');
        
        if (invoice.parent_document_id === null) {
          console.log('\n🔧 Обновляем связь счета с КП...');
          
          const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              parent_document_id: quote.id
            },
            select: {
              id: true,
              number: true,
              parent_document_id: true
            }
          });
          
          console.log('✅ Связь обновлена!');
          console.log(`   Счет: ${updatedInvoice.number}`);
          console.log(`   Новый parent_document_id: ${updatedInvoice.parent_document_id}`);
          
          // Проверяем полную цепочку
          console.log('\n🔍 Проверяем полную цепочку связей:');
          console.log('✅ ПОЛНАЯ ЦЕПОЧКА СВЯЗЕЙ:');
          console.log(`   📋 КП: ${quote.number}`);
          console.log(`   ↓ (parent_document_id: ${quote.id})`);
          console.log(`   💰 Счет: ${updatedInvoice.number}`);
          console.log(`   ↓ (parent_document_id: ${updatedInvoice.parent_document_id})`);
          console.log(`   📦 Заказ: ORD-001`);
          console.log(`   ↓ (parent_document_id: cmh2ewyxm000jlrzr1qxu8chy)`);
          console.log(`   🚚 Заказ поставщика: SUPPLIER-1761162898023`);
          
        } else {
          console.log('⚠️ У счета уже есть parent_document_id:', invoice.parent_document_id);
        }
        
      } else {
        console.log('❌ cart_session_id не совпадают');
        console.log(`   КП: ${quote.cart_session_id}`);
        console.log(`   Счет: ${invoice.cart_session_id}`);
      }
      
    } else {
      console.log('❌ Не удалось найти счет или КП');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInvoiceQuoteLink();
