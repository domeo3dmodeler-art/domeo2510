import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Пути, которые требуют авторизации
const protectedPaths = ['/complectator', '/executor', '/doors', '/universal'];
const publicPaths = ['/login', '/'];

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
  
  // Отладочная информация
  console.log('🔐 MIDDLEWARE: Checking path:', pathname);
  console.log('🔐 MIDDLEWARE: Protected paths:', protectedPaths);
  
  // Проверяем, является ли путь защищенным
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  console.log('🔐 MIDDLEWARE: Is protected:', isProtectedPath);
  
  if (!isProtectedPath) {
    console.log('🔐 MIDDLEWARE: Path not protected, allowing access');
    return NextResponse.next();
  }
  
  console.log('🔐 MIDDLEWARE: Path is protected, checking auth');

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
  
  console.log('🔐 MIDDLEWARE: Token sources:', {
    authToken: authToken ? `${authToken.substring(0, 20)}...` : 'null',
    domeoToken: domeoToken ? `${domeoToken.substring(0, 20)}...` : 'null',
    headerAuthToken: headerAuthToken ? `${headerAuthToken.substring(0, 20)}...` : 'null',
    headerDomeoToken: headerDomeoToken ? `${headerDomeoToken.substring(0, 20)}...` : 'null',
    finalToken: token ? `${token.substring(0, 20)}...` : 'null'
  });
  
  // Дополнительная отладка - проверяем все возможные способы чтения токена
  const allCookies = request.cookies.getAll();
  console.log('🔐 MIDDLEWARE: All cookie names:', allCookies.map(c => c.name));
  console.log('🔐 MIDDLEWARE: Cookie values:', allCookies.map(c => `${c.name}=${c.value.substring(0, 30)}...`));
        
  // Отладочная информация
  console.log('🔐 MIDDLEWARE: Auth check:', pathname, 'Token:', !!token, 'Length:', token?.length);
  console.log('🔐 MIDDLEWARE: All cookies:', request.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`));
  console.log('🔐 MIDDLEWARE: Raw cookie header:', request.headers.get('cookie'));
  
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
      console.log('🔐 Token to verify:', token.substring(0, 50) + '...');
      
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jwtVerify(token, secret);
      
      console.log('🔐 jwtVerify result:', payload);
      
      if (!payload) {
        console.log('❌ jwtVerify returned null/undefined');
        throw new Error('Token verification returned null');
      }
      
      console.log('✅ Token verified successfully:', { role: payload.role, userId: payload.userId });
      console.log('🔐 User role:', payload.role, 'Path:', pathname);
      console.log('🔐 Decoded token:', JSON.stringify(payload, null, 2));
    
    const userRole = payload.role?.toString().toLowerCase();

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

    // Проверяем доступ к экспорту заказов на фабрику
    if (factoryExportPaths.some(path => pathname.startsWith(path))) {
      if (!['admin', 'executor'].includes(userRole)) {
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url));
      }
    }

    // Добавляем информацию о пользователе в заголовки
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId?.toString() || '');
    requestHeaders.set('x-user-role', userRole || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    // Токен недействителен
    console.log('❌ Token verification failed:', error);
    console.log('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      token: token ? `${token.substring(0, 30)}...` : 'null'
    });
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