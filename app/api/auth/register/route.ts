import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { getRolePermissions } from '../../../lib/auth/roles';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    const { email, password, firstName, lastName, middleName, role } = await req.json();

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Все обязательные поля должны быть заполнены' },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь с таким email не существует
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Валидация пароля
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не короче 6 символов' },
        { status: 400 }
      );
    }

    // Валидация роли
    const validRoles = ['admin', 'complectator', 'executor'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Недопустимая роль пользователя' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 12);

    // Создаем нового пользователя в базе данных
    const newUser = await prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || null,
        role: role.toUpperCase(),
        is_active: true
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        role: true,
        is_active: true,
        created_at: true
      }
    });

    // Возвращаем данные пользователя (без пароля)
    const userData = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      middleName: newUser.middle_name,
      role: newUser.role.toLowerCase(),
      isActive: newUser.is_active,
      createdAt: newUser.created_at
    };

    return NextResponse.json({
      success: true,
      message: 'Пользователь успешно создан',
      user: userData
    });

  } catch (error) {
    logger.error('Registration error', 'auth/register', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}