const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDocuments() {
  try {
    console.log('🔍 Проверяем последние документы...');
    
    const quotes = await prisma.quote.findMany({
      select: { number: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    
    console.log('📋 Последние КП:', quotes);
    
    const invoices = await prisma.invoice.findMany({
      select: { number: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take: 5
    });
    
    console.log('💰 Последние счета:', invoices);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocuments();
