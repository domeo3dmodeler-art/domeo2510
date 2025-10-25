const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditDocumentLinks() {
  try {
    console.log('🔍 ПОЛНЫЙ АУДИТ СИСТЕМЫ СВЯЗЕЙ ДОКУМЕНТОВ\n');
    
    // 1. Получаем все документы
    const [quotes, invoices, orders, supplierOrders] = await Promise.all([
      prisma.quote.findMany({
        select: {
          id: true,
          number: true,
          parent_document_id: true,
          cart_session_id: true,
          total_amount: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.invoice.findMany({
        select: {
          id: true,
          number: true,
          parent_document_id: true,
          cart_session_id: true,
          total_amount: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.order.findMany({
        select: {
          id: true,
          number: true,
          parent_document_id: true,
          cart_session_id: true,
          total_amount: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.supplierOrder.findMany({
        select: {
          id: true,
          number: true,
          parent_document_id: true,
          cart_session_id: true,
          total_amount: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      })
    ]);
    
    console.log('📊 СТАТИСТИКА ДОКУМЕНТОВ:');
    console.log(`   КП (quotes): ${quotes.length}`);
    console.log(`   Счета (invoices): ${invoices.length}`);
    console.log(`   Заказы (orders): ${orders.length}`);
    console.log(`   Заказы поставщика (supplierOrders): ${supplierOrders.length}\n`);
    
    // 2. Анализируем связи
    console.log('🔗 АНАЛИЗ СВЯЗЕЙ:\n');
    
    // КП
    console.log('📋 КОММЕРЧЕСКИЕ ПРЕДЛОЖЕНИЯ:');
    quotes.forEach((quote, index) => {
      console.log(`   ${index + 1}. ${quote.number}`);
      console.log(`      parent_document_id: ${quote.parent_document_id || 'null'}`);
      console.log(`      cart_session_id: ${quote.cart_session_id || 'null'}`);
      console.log(`      total_amount: ${quote.total_amount}`);
      console.log(`      created_at: ${quote.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // Счета
    console.log('💰 СЧЕТА:');
    invoices.forEach((invoice, index) => {
      console.log(`   ${index + 1}. ${invoice.number}`);
      console.log(`      parent_document_id: ${invoice.parent_document_id || 'null'}`);
      console.log(`      cart_session_id: ${invoice.cart_session_id || 'null'}`);
      console.log(`      total_amount: ${invoice.total_amount}`);
      console.log(`      created_at: ${invoice.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // Заказы
    console.log('📦 ЗАКАЗЫ:');
    orders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.number}`);
      console.log(`      parent_document_id: ${order.parent_document_id || 'null'}`);
      console.log(`      cart_session_id: ${order.cart_session_id || 'null'}`);
      console.log(`      total_amount: ${order.total_amount}`);
      console.log(`      created_at: ${order.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // Заказы поставщика
    console.log('🚚 ЗАКАЗЫ ПОСТАВЩИКА:');
    supplierOrders.forEach((so, index) => {
      console.log(`   ${index + 1}. ${so.number}`);
      console.log(`      parent_document_id: ${so.parent_document_id || 'null'}`);
      console.log(`      cart_session_id: ${so.cart_session_id || 'null'}`);
      console.log(`      total_amount: ${so.total_amount}`);
      console.log(`      created_at: ${so.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // 3. Проверяем цепочки связей
    console.log('🔗 ПРОВЕРКА ЦЕПОЧЕК СВЯЗЕЙ:\n');
    
    // Ищем полные цепочки
    const fullChains = [];
    
    for (const so of supplierOrders) {
      if (so.parent_document_id) {
        const order = orders.find(o => o.id === so.parent_document_id);
        if (order) {
          let chain = {
            supplierOrder: so,
            order: order,
            invoice: null
          };
          
          if (order.parent_document_id) {
            const invoice = invoices.find(i => i.id === order.parent_document_id);
            if (invoice) {
              chain.invoice = invoice;
            }
          }
          
          fullChains.push(chain);
        }
      }
    }
    
    console.log(`✅ НАЙДЕНО ${fullChains.length} ПОЛНЫХ ЦЕПОЧЕК:`);
    fullChains.forEach((chain, index) => {
      console.log(`\n   Цепочка ${index + 1}:`);
      console.log(`   🚚 Заказ поставщика: ${chain.supplierOrder.number}`);
      console.log(`   📦 Заказ: ${chain.order.number}`);
      if (chain.invoice) {
        console.log(`   💰 Счет: ${chain.invoice.number}`);
      } else {
        console.log(`   ❌ Счет: НЕ НАЙДЕН`);
      }
    });
    
    // 4. Ищем проблемы
    console.log('\n⚠️ ПРОБЛЕМЫ В СВЯЗЯХ:\n');
    
    // Заказы поставщика без родителя
    const orphanSupplierOrders = supplierOrders.filter(so => !so.parent_document_id);
    if (orphanSupplierOrders.length > 0) {
      console.log(`❌ Заказы поставщика без родителя (${orphanSupplierOrders.length}):`);
      orphanSupplierOrders.forEach(so => {
        console.log(`   - ${so.number}`);
      });
      console.log('');
    }
    
    // Заказы без родителя
    const orphanOrders = orders.filter(o => !o.parent_document_id);
    if (orphanOrders.length > 0) {
      console.log(`❌ Заказы без родителя (${orphanOrders.length}):`);
      orphanOrders.forEach(o => {
        console.log(`   - ${o.number}`);
      });
      console.log('');
    }
    
    // Счета без родителя
    const orphanInvoices = invoices.filter(i => !i.parent_document_id);
    if (orphanInvoices.length > 0) {
      console.log(`❌ Счета без родителя (${orphanInvoices.length}):`);
      orphanInvoices.forEach(i => {
        console.log(`   - ${i.number}`);
      });
      console.log('');
    }
    
    // 5. Рекомендации по исправлению
    console.log('🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ:\n');
    
    if (orphanOrders.length > 0) {
      console.log('1. Исправить связи заказов со счетами:');
      for (const order of orphanOrders) {
        // Ищем счет по времени и сумме
        const matchingInvoice = invoices.find(i => 
          Math.abs(new Date(i.created_at).getTime() - new Date(order.created_at).getTime()) < 30 * 60 * 1000 && // в пределах 30 минут
          i.total_amount === order.total_amount
        );
        
        if (matchingInvoice) {
          console.log(`   - Связать ${order.number} с ${matchingInvoice.number}`);
        } else {
          console.log(`   - Не найден подходящий счет для ${order.number}`);
        }
      }
      console.log('');
    }
    
    console.log('✅ АУДИТ ЗАВЕРШЕН');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditDocumentLinks();
