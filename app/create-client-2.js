const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createClient2() {
  try {
    const client = await prisma.client.create({
      data: {
        id: '2',
        firstName: 'Анна',
        lastName: 'Петрова',
        middleName: 'Сергеевна',
        phone: '+7 (999) 765-43-21',
        address: 'г. Москва, ул. Тестовая, д. 2',
        objectId: 'test-object-2'
      }
    });
    
    console.log('Created client 2:', client);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createClient2();

