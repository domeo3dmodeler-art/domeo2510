// scripts/create-admin.ts
// Скрипт для создания первого администратора системы

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Создание администратора...');

    // Проверяем, есть ли уже администраторы
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('Администратор уже существует:', existingAdmin.email);
      return;
    }

    // Данные администратора
    const adminData = {
      email: 'admin@domeo.ru',
      password: 'admin123',
      firstName: 'Администратор',
      lastName: 'Системы',
      middleName: 'Главный',
      role: 'ADMIN' as const
    };

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(adminData.password, 12);

    // Создаем администратора
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        password_hash: passwordHash,
        first_name: adminData.firstName,
        last_name: adminData.lastName,
        middle_name: adminData.middleName,
        role: adminData.role,
        is_active: true
      }
    });

    console.log('✅ Администратор успешно создан!');
    console.log('Email:', admin.email);
    console.log('Пароль:', adminData.password);
    console.log('Роль:', admin.role);

  } catch (error) {
    console.error('❌ Ошибка создания администратора:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем создание администратора
createAdmin();
