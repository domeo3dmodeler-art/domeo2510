import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Пути, которые требуют авторизации
const protectedPaths = ['/admin', '/complectator', '/executor', '/universal'];
const publicPaths = ['/login', '/', '/catalog', '/doors'];

// Пути только для админов
const adminOnlyPaths = [
  '/admin/users',
  '/admin/settings',
  '/admin/analytics',
  '/admin/notifications-demo',
  '/admin/categories/builder',
  '/admin/catalog/import'
];

// Пути для комплектаторов
const complectatorPaths = [
  '/admin/categories',
  '/admin/catalog',
  '/admin/clients'
];

// Пути для исполнителей
const executorPaths = [
  '/admin/catalog'
];

// Пути для экспорта заказов на фабрику (Админ и Исполнитель)
const factoryExportPaths = [
  '/api/cart/export/doors/factory'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Проверяем, является ли путь защищенным
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // Получаем токен из cookies (несколько способов для совместимости)
  const authToken = request.cookies.get('auth-token')?.value;
  const domeoToken = request.cookies.get('domeo-auth-token')?.value;
  const headerAuthToken = request.headers.get('cookie')?.split(';')
    .find(c => c.trim().startsWith('auth-token='))
    ?.split('=')[1];
  const headerDomeoToken = request.headers.get('cookie')?.split(';')
    .find(c => c.trim().startsWith('domeo-auth-token='))
    ?.split('=')[1];
    
  const token = authToken || domeoToken || headerAuthToken || headerDomeoToken;
  
  // Отладочная информация только в development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 MIDDLEWARE: Checking protected path:', pathname);
    console.log('🔐 MIDDLEWARE: Token present:', !!token);
  }
  
  if (!token) {
    // Перенаправляем на страницу входа
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

    try {
      // Проверяем токен
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        console.error('❌ JWT_SECRET is not set! This is required for production.');
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET environment variable is required');
        }
        // Для development можно использовать временный ключ, но нужно предупредить
        console.warn('⚠️ Using temporary JWT_SECRET for development. Set JWT_SECRET in production!');
        throw new Error('JWT_SECRET must be set in environment variables');
      }
      
      if (jwtSecret.length < 32) {
        console.error('❌ JWT_SECRET is too short! Minimum length is 32 characters.');
        throw new Error('JWT_SECRET must be at least 32 characters long');
      }
      
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret);
      
      if (!payload) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ jwtVerify returned null/undefined');
        }
        throw new Error('Token verification returned null');
      }
      
      // Логирование только в development
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Token verified successfully:', { role: payload.role, userId: payload.userId });
      }
    
    const userRole = payload.role?.toString().toLowerCase() || '';

    // Проверяем доступ к админ-панели
    if (pathname.startsWith('/admin')) {
      // Только админы, комплектаторы и исполнители имеют доступ к админ-панели
      if (!userRole || !['admin', 'complectator', 'executor'].includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Проверяем доступ к админ-только путям
    if (adminOnlyPaths.some(path => pathname.startsWith(path))) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Проверяем доступ комплектаторов
    if (complectatorPaths.some(path => pathname.startsWith(path))) {
      if (!userRole || !['admin', 'complectator'].includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Проверяем доступ исполнителей
    if (executorPaths.some(path => pathname.startsWith(path))) {
      if (!userRole || !['admin', 'executor'].includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Проверяем доступ к экспорту заказов на фабрику
    if (factoryExportPaths.some(path => pathname.startsWith(path))) {
      if (!userRole || !['admin', 'executor'].includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Добавляем информацию о пользователе в заголовки
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId?.toString() || '');
    requestHeaders.set('x-user-role', userRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    // Токен недействителен
    if (process.env.NODE_ENV === 'development') {
      console.log('❌ Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};