import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API endpoint для удаления всех документов из БД
 * DELETE /api/admin/delete-all-documents
 * 
 * ВНИМАНИЕ: Это необратимая операция!
 * Удаляет: Order, Invoice, Quote, SupplierOrder
 */
export async function DELETE(req: NextRequest) {
  try {
    console.log('🚨 Начинаем удаление всех документов из БД...');
    
    // Подсчитываем количество документов перед удалением
    const ordersCount = await prisma.order.count();
    const invoicesCount = await prisma.invoice.count();
    const quotesCount = await prisma.quote.count();
    const supplierOrdersCount = await prisma.supplierOrder.count();
    
    console.log(`📊 Найдено документов:`);
    console.log(`  - Заказов (Order): ${ordersCount}`);
    console.log(`  - Счетов (Invoice): ${invoicesCount}`);
    console.log(`  - КП (Quote): ${quotesCount}`);
    console.log(`  - Заказов у поставщика (SupplierOrder): ${supplierOrdersCount}`);
    
    // Удаляем в правильном порядке (сначала зависимые, потом основные)
    // 1. SupplierOrder (зависит от Invoice и Order)
    console.log('\n🗑️ Удаляем заказы у поставщика...');
    const deletedSupplierOrders = await prisma.supplierOrder.deleteMany({});
    console.log(`✅ Удалено заказов у поставщика: ${deletedSupplierOrders.count}`);
    
    // 2. Quote (зависит от Order)
    console.log('\n🗑️ Удаляем КП...');
    const deletedQuotes = await prisma.quote.deleteMany({});
    console.log(`✅ Удалено КП: ${deletedQuotes.count}`);
    
    // 3. Invoice (зависит от Order)
    console.log('\n🗑️ Удаляем счета...');
    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`✅ Удалено счетов: ${deletedInvoices.count}`);
    
    // 4. Order (основная сущность)
    console.log('\n🗑️ Удаляем заказы...');
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Удалено заказов: ${deletedOrders.count}`);
    
    console.log('\n✅ Все документы успешно удалены из БД!');
    
    // Проверяем что все удалено
    const finalOrdersCount = await prisma.order.count();
    const finalInvoicesCount = await prisma.invoice.count();
    const finalQuotesCount = await prisma.quote.count();
    const finalSupplierOrdersCount = await prisma.supplierOrder.count();
    
    return NextResponse.json({
      success: true,
      deleted: {
        orders: deletedOrders.count,
        invoices: deletedInvoices.count,
        quotes: deletedQuotes.count,
        supplierOrders: deletedSupplierOrders.count
      },
      before: {
        orders: ordersCount,
        invoices: invoicesCount,
        quotes: quotesCount,
        supplierOrders: supplierOrdersCount
      },
      after: {
        orders: finalOrdersCount,
        invoices: finalInvoicesCount,
        quotes: finalQuotesCount,
        supplierOrders: finalSupplierOrdersCount
      }
    });
  } catch (error) {
    console.error('❌ Ошибка при удалении документов:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении документов', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

