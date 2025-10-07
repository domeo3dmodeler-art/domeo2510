import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Пути, которые требуют авторизации
const protectedPaths = ['/complectator', '/executor'];
const publicPaths = ['/login', '/', '/dashboard', '/admin'];

// Пути только для админов
const adminOnlyPaths = [
  '/admin/users',
  '/admin/settings',
  '/admin/analytics',
  '/admin/notifications-demo'
];

// Пути для комплектаторов
const complectatorPaths = [
  '/admin/categories',
  '/admin/categories/builder',
  '/admin/catalog'
];

// Пути для исполнителей
const executorPaths = [
  '/admin/catalog'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Проверяем, является ли путь защищенным
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // Получаем токен из cookies
  const token = request.cookies.get('auth-token')?.value;
        
        // Отладочная информация
        console.error('🔐 MIDDLEWARE: Auth check:', pathname, 'Token:', !!token, 'Length:', token?.length);
  
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
        console.error('JWT_SECRET environment variable is required');
        return NextResponse.redirect(new URL('/login', request.url));
      }
      console.log('🔐 Verifying token with secret length:', jwtSecret.length);
      
      const decoded = jwt.verify(token, jwtSecret) as { role?: string; userId?: string; email?: string };
      console.log('✅ Token verified successfully:', { role: decoded.role, userId: decoded.userId });
    
    const userRole = decoded.role?.toLowerCase();

    // Проверяем доступ к админ-панели
    if (pathname.startsWith('/admin')) {
      // Только админы, комплектаторы и исполнители имеют доступ к админ-панели
      if (!['admin', 'complectator', 'executor'].includes(userRole)) {
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
      if (!['admin', 'complectator'].includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Проверяем доступ исполнителей
    if (executorPaths.some(path => pathname.startsWith(path))) {
      if (!['admin', 'executor'].includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Добавляем информацию о пользователе в заголовки
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', userRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    // Токен недействителен
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