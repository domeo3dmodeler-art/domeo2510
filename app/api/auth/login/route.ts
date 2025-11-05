import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authRateLimiter, getClientIP, createRateLimitResponse } from '../../../../lib/security/rate-limiter';
import { logger } from '@/lib/logging/logger';
import { getLoggingContextFromRequest } from '@/lib/auth/logging-context';

export async function POST(req: NextRequest) {
  const loggingContext = getLoggingContextFromRequest(req);
  try {
    // Получаем JWT_SECRET из переменных окружения (обязательно в production)
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET is not set! This is required for production.', 'auth/login', {}, loggingContext);
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'JWT_SECRET must be set in environment variables' },
        { status: 500 }
      );
    }
    
    if (JWT_SECRET.length < 32) {
      logger.error('JWT_SECRET is too short! Minimum length is 32 characters.', 'auth/login', {}, loggingContext);
      return NextResponse.json(
        { error: 'JWT_SECRET must be at least 32 characters long' },
        { status: 500 }
      );
    }
    
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
    
    // Логирование только в development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Server cookie set for user', 'auth/login', { email: userData.email }, loggingContext);
    }

    return response;

  } catch (error) {
    logger.error('Login error', 'auth/login', { error }, loggingContext);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
