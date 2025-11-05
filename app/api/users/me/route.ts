import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getRoleDisplayName, getRoleIcon, getRoleColor } from '../../../../lib/auth/roles';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars";

export async function GET(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    // Получаем токен из заголовков или cookie
    let token: string | null = null;
    
    // Сначала проверяем заголовок Authorization
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Если токена нет в заголовке, проверяем cookie
    if (!token) {
      const cookies = req.cookies;
      token = cookies.get('auth-token')?.value || cookies.get('domeo-auth-token')?.value || null;
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'Токен авторизации не предоставлен' },
        { status: 401 }
      );
    }
    
    // Проверяем JWT токен
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Недействительный токен' },
        { status: 401 }
      );
    }

    // Получаем пользователя из базы данных
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Аккаунт заблокирован' },
        { status: 401 }
      );
    }

    // Форматируем данные пользователя
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      role: user.role.toLowerCase(),
      roleDisplayName: getRoleDisplayName(user.role.toLowerCase()),
      roleIcon: getRoleIcon(user.role.toLowerCase()),
      roleColor: getRoleColor(user.role.toLowerCase()),
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at
    };

    return NextResponse.json({
      success: true,
      user: userData
    });

  } catch (error) {
    logger.error('Error getting user info', 'users/me', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
