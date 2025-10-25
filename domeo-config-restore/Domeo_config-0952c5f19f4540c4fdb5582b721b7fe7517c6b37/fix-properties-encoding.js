const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPropertiesEncoding() {
  console.log('🔍 Поиск свойств с проблемами кодировки...');
  
  try {
    const properties = await prisma.productProperty.findMany();
    console.log(`📊 Найдено свойств: ${properties.length}`);

    let fixedCount = 0;
    let problematicCount = 0;

    for (const property of properties) {
      let needsUpdate = false;
      let newName = property.name;
      let newDescription = property.description;

      // Проверяем название на наличие кракозябр
      if (property.name && /[^\x00-\x7F]/.test(property.name) && property.name.includes('?')) {
        console.log(`❌ Проблемное название: "${property.name}"`);
        
        // Попробуем исправить известные случаи
        if (property.name.includes('????? ???????? ????????')) {
          newName = 'Тестовое свойство списка';
          needsUpdate = true;
        } else if (property.name.includes('???????? ???????? 2')) {
          newName = 'Тестовое свойство 2';
          needsUpdate = true;
        } else {
          // Для неизвестных случаев просто заменим на читаемое название
          newName = `Свойство ${property.id.slice(-4)}`;
          needsUpdate = true;
        }
      }

      // Проверяем описание
      if (property.description && /[^\x00-\x7F]/.test(property.description) && property.description.includes('?')) {
        console.log(`❌ Проблемное описание: "${property.description}"`);
        
        if (property.description.includes('???????? ??? ????????? ????????')) {
          newDescription = 'Описание для тестового свойства списка';
          needsUpdate = true;
        } else if (property.description.includes('????????')) {
          newDescription = 'Описание для тестового свойства';
          needsUpdate = true;
        } else {
          newDescription = `Описание для свойства ${property.id.slice(-4)}`;
          needsUpdate = true;
        }
      }

      // Проверяем опции для select полей
      if (property.options && typeof property.options === 'string') {
        try {
          const options = JSON.parse(property.options);
          if (Array.isArray(options)) {
            let hasProblematicOptions = false;
            const fixedOptions = options.map(option => {
              if (typeof option === 'string' && option.includes('?')) {
                hasProblematicOptions = true;
                if (option.includes('????? 1')) return 'Вариант 1';
                if (option.includes('????? 2')) return 'Вариант 2';
                if (option.includes('????? 3')) return 'Вариант 3';
                return `Вариант ${Math.random().toString(36).substr(2, 4)}`;
              }
              return option;
            });
            
            if (hasProblematicOptions) {
              console.log(`❌ Проблемные опции: ${JSON.stringify(options)}`);
              await prisma.productProperty.update({
                where: { id: property.id },
                data: { options: JSON.stringify(fixedOptions) }
              });
              console.log(`✅ Исправлены опции для свойства: ${property.id}`);
              fixedCount++;
            }
          }
        } catch (e) {
          console.log(`❌ Ошибка парсинга опций для ${property.id}: ${e.message}`);
        }
      }

      // Обновляем название и описание если нужно
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
      } else {
        problematicCount++;
      }
    }

    console.log(`🎉 Исправлено свойств: ${fixedCount}`);
    console.log(`📋 Осталось проблемных свойств: ${problematicCount - fixedCount}`);

  } catch (error) {
    console.error('❌ Ошибка при исправлении кодировки:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPropertiesEncoding();
