const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllData() {
  try {
    console.log('🧹 Начинаем очистку всех данных...');
    
    // Удаляем все документы и связанные данные в правильном порядке
    console.log('📄 Удаляем все элементы заказов поставщикам...');
    await prisma.supplierOrderItem.deleteMany();
    
    console.log('📄 Удаляем все заказы поставщикам...');
    await prisma.supplierOrder.deleteMany();
    
    console.log('📄 Удаляем все элементы заказов...');
    await prisma.orderItem.deleteMany();
    
    console.log('📄 Удаляем все заказы...');
    await prisma.order.deleteMany();
    
    console.log('📄 Удаляем все элементы счетов...');
    await prisma.invoiceItem.deleteMany();
    
    console.log('📄 Удаляем все счета...');
    await prisma.invoice.deleteMany();
    
    console.log('📄 Удаляем все элементы КП...');
    await prisma.quoteItem.deleteMany();
    
    console.log('📄 Удаляем все КП...');
    await prisma.quote.deleteMany();
    
    // Удаляем уведомления
    console.log('🔔 Удаляем все уведомления...');
    await prisma.notification.deleteMany();
    
    // Удаляем всех клиентов
    console.log('👥 Удаляем всех клиентов...');
    await prisma.client.deleteMany();
    
    console.log('✅ Все данные успешно удалены!');
    
    // Проверяем, что все таблицы пусты
    const counts = {
      clients: await prisma.client.count(),
      quotes: await prisma.quote.count(),
      quoteItems: await prisma.quoteItem.count(),
      invoices: await prisma.invoice.count(),
      invoiceItems: await prisma.invoiceItem.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      supplierOrders: await prisma.supplierOrder.count(),
      supplierOrderItems: await prisma.supplierOrderItem.count(),
      notifications: await prisma.notification.count()
    };
    
    console.log('📊 Статистика после очистки:');
    console.log(`👥 Клиенты: ${counts.clients}`);
    console.log(`📄 КП: ${counts.quotes}`);
    console.log(`📄 Элементы КП: ${counts.quoteItems}`);
    console.log(`📄 Счета: ${counts.invoices}`);
    console.log(`📄 Элементы счетов: ${counts.invoiceItems}`);
    console.log(`📄 Заказы: ${counts.orders}`);
    console.log(`📄 Элементы заказов: ${counts.orderItems}`);
    console.log(`📄 Заказы поставщикам: ${counts.supplierOrders}`);
    console.log(`📄 Элементы заказов поставщикам: ${counts.supplierOrderItems}`);
    console.log(`🔔 Уведомления: ${counts.notifications}`);
    
  } catch (error) {
    console.error('❌ Ошибка при очистке данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllData();
