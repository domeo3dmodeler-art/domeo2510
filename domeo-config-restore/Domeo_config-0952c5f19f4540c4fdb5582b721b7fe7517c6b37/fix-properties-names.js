const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPropertiesNames() {
  console.log('🔍 Исправление названий и описаний свойств...');
  
  try {
    const properties = await prisma.productProperty.findMany();
    console.log(`📊 Найдено свойств: ${properties.length}`);

    let fixedCount = 0;

    for (const property of properties) {
      let needsUpdate = false;
      let newName = property.name;
      let newDescription = property.description;

      // Исправляем конкретные случаи
      if (property.name === '????? ???????? ????????') {
        newName = 'Тестовое свойство списка';
        newDescription = 'Описание для тестового свойства списка';
        needsUpdate = true;
      } else if (property.name === '???????? ???????? 2') {
        newName = 'Тестовое свойство 2';
        newDescription = 'Описание для тестового свойства 2';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.productProperty.update({
          where: { id: property.id },
          data: {
            name: newName,
            description: newDescription,
          },
        });
        console.log(`✅ Исправлено свойство: ${property.id} -> "${newName}"`);
        fixedCount++;
      }
    }

    console.log(`🎉 Исправлено свойств: ${fixedCount}`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPropertiesNames();
