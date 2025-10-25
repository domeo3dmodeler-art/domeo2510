import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authRateLimiter, getClientIP, createRateLimitResponse } from '../../../../lib/security/rate-limiter';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Устанавливаем JWT_SECRET напрямую для разработки
    const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production-min-32-chars";
    
    // Rate limiting
    const clientIP = getClientIP(req);
    if (!authRateLimiter.isAllowed(clientIP)) {
      return createRateLimitResponse(authRateLimiter, clientIP);
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    // Ищем пользователя в базе данных
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        first_name: true,
        last_name: true,
        middle_name: true,
        role: true,
        is_active: true,
        last_login: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Аккаунт заблокирован' },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Обновляем время последнего входа
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Создаем JWT токен
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ 
      userId: user.id, 
      email: user.email, 
      role: user.role.toLowerCase() // Приводим роль к нижнему регистру
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(secret);

    // Возвращаем данные пользователя (без пароля)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      role: user.role.toLowerCase(), // Приводим роль к нижнему регистру
      lastLogin: user.last_login
    };

    const response = NextResponse.json({
      success: true,
      token,
      user: userData
    });

    // Устанавливаем cookie на сервере
        response.cookies.set('auth-token', token, {
          httpOnly: false, // Позволяем доступ из JavaScript
          secure: false,   // Для локальной разработки
          sameSite: 'lax',
          maxAge: 86400,   // 24 часа
          path: '/',
          // Дополнительные параметры для Yandex браузера
          domain: undefined, // Явно убираем domain
          partitioned: false // Отключаем partitioned cookies
        });
    
    console.log('🍪 Server cookie set:', token.substring(0, 20) + '...');

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
