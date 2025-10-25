const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testStatusBlocking() {
  console.log('🧪 ТЕСТ БЛОКИРОВКИ СТАТУСОВ\n');

  try {
    // 1. Находим счет с заблокированным статусом
    const invoice = await prisma.invoice.findFirst({
      where: { 
        status: { in: ['ORDERED', 'IN_PRODUCTION', 'READY', 'COMPLETED'] }
      },
      select: {
        id: true,
        number: true,
        status: true,
        parent_document_id: true,
        cart_session_id: true
      }
    });

    if (!invoice) {
      console.log('❌ Не найден счет с заблокированным статусом');
      return;
    }

    console.log(`📄 Тестируем счет: ${invoice.number}`);
    console.log(`   - ID: ${invoice.id}`);
    console.log(`   - Статус: ${invoice.status}`);

    // 2. Проверяем есть ли связанные заказы поставщику
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { parent_document_id: invoice.id },
          { cart_session_id: invoice.cart_session_id }
        ]
      },
      select: { id: true }
    });

    console.log(`\n📦 Связанные заказы: ${orders.length}`);

    let hasSupplierOrders = false;
    for (const order of orders) {
      const supplierOrders = await prisma.supplierOrder.findMany({
        where: { parent_document_id: order.id },
        select: { id: true, number: true, status: true }
      });

      if (supplierOrders.length > 0) {
        hasSupplierOrders = true;
        console.log(`   - Заказ ${order.id}: ${supplierOrders.length} заказов поставщику`);
        supplierOrders.forEach(so => {
          console.log(`     * ${so.number}: ${so.status}`);
        });
      }
    }

    console.log(`\n🔒 Есть заказы поставщику: ${hasSupplierOrders ? 'ДА' : 'НЕТ'}`);

    // 3. Тестируем API блокировки
    console.log('\n🔄 Тестируем API блокировки...');
    
    const response = await fetch(`http://localhost:3000/api/invoices/${invoice.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DRAFT' })
    });

    const result = await response.json();
    console.log(`   Статус ответа: ${response.status}`);
    console.log(`   Ответ:`, result);

    if (response.status === 403 && result.blocked) {
      console.log('✅ Блокировка работает правильно!');
      console.log(`   Текущий статус: ${result.currentStatus}`);
    } else {
      console.log('❌ Блокировка не работает!');
    }

    // 4. Тестируем счет без заказов поставщику
    console.log('\n🔄 Тестируем счет без заказов поставщику...');
    
    const freeInvoice = await prisma.invoice.findFirst({
      where: { 
        status: 'DRAFT',
        NOT: { id: invoice.id }
      },
      select: { id: true, number: true, status: true }
    });

    if (freeInvoice) {
      console.log(`📄 Тестируем свободный счет: ${freeInvoice.number}`);
      
      const freeResponse = await fetch(`http://localhost:3000/api/invoices/${freeInvoice.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' })
      });

      const freeResult = await freeResponse.json();
      console.log(`   Статус ответа: ${freeResponse.status}`);
      
      if (freeResponse.ok) {
        console.log('✅ Свободный счет можно изменить!');
      } else {
        console.log('❌ Свободный счет заблокирован!');
        console.log(`   Ответ:`, freeResult);
      }
    } else {
      console.log('⚠️ Не найден свободный счет для тестирования');
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем тест
testStatusBlocking();
