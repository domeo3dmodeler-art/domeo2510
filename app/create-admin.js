const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Создание администратора...');

    // Проверяем, есть ли уже администраторы
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('Администратор уже существует:', existingAdmin.email);
      return;
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Создаем администратора
    const admin = await prisma.user.create({
      data: {
        email: 'admin@domeo.ru',
        password_hash: passwordHash,
        first_name: 'Администратор',
        last_name: 'Системы',
        middle_name: 'Главный',
        role: 'admin',
        is_active: true
      }
    });

    console.log('✅ Администратор успешно создан!');
    console.log('Email:', admin.email);
    console.log('Пароль: admin123');
    console.log('Роль:', admin.role);

  } catch (error) {
    console.error('❌ Ошибка создания администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем создание администратора
createAdmin();



