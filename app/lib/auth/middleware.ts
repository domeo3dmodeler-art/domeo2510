// lib/auth/middleware.ts
// Middleware для проверки прав доступа

import { NextRequest, NextResponse } from 'next/server';
import { roleService, Role, Permission } from './roles';

export type AuthContext = {
  userId: string;
  role: Role;
  permissions: Permission[];
};

// Middleware для проверки аутентификации
export function requireAuth(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Получаем токен из заголовков
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Токен авторизации не предоставлен' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      
      // Здесь должна быть проверка JWT токена
      // Пока используем заглушку
      const user = await validateToken(token);
      if (!user) {
        return NextResponse.json(
          { error: 'Недействительный токен' },
          { status: 401 }
        );
      }

      const context: AuthContext = {
        userId: user.id,
        role: user.role,
        permissions: roleService.getRolePermissions(user.role)
      };

      return await handler(req, context);
    } catch (error) {
      return NextResponse.json(
        { error: 'Ошибка авторизации' },
        { status: 401 }
      );
    }
  };
}

// Middleware для проверки разрешений
export function requirePermission(permission: Permission) {
  return function(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context: AuthContext): Promise<NextResponse> => {
      if (!roleService.hasPermission(context.role, permission)) {
        return NextResponse.json(
          { 
            error: 'Недостаточно прав доступа',
            required: permission,
            current: context.role
          },
          { status: 403 }
        );
      }

      return await handler(req, context);
    };
  };
}

// Middleware для проверки роли
export function requireRole(requiredRole: Role) {
  return function(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context: AuthContext): Promise<NextResponse> => {
      const currentLevel = roleService.getRoleLevel(context.role);
      const requiredLevel = roleService.getRoleLevel(requiredRole);

      if (currentLevel < requiredLevel) {
        return NextResponse.json(
          { 
            error: 'Недостаточно прав доступа',
            required: requiredRole,
            current: context.role
          },
          { status: 403 }
        );
      }

      return await handler(req, context);
    };
  };
}

// Middleware для проверки доступа к КП
export function requireQuoteAccess(action: 'read' | 'update' | 'delete' | 'change_status') {
  return function(handler: (req: NextRequest, context: AuthContext, quoteId: string) => Promise<NextResponse>) {
    return async (req: NextRequest, context: AuthContext, quoteId: string): Promise<NextResponse> => {
      // Здесь должна быть проверка существования КП и его статуса
      // Пока используем заглушку
      const quote = await getQuoteById(quoteId);
      if (!quote) {
        return NextResponse.json(
          { error: 'КП не найден' },
          { status: 404 }
        );
      }

      if (!roleService.canAccessQuote(context.role, quote.status, action)) {
        return NextResponse.json(
          { 
            error: 'Недостаточно прав доступа к КП',
            quoteId,
            quoteStatus: quote.status,
            requiredAction: action,
            currentRole: context.role
          },
          { status: 403 }
        );
      }

      return await handler(req, context, quoteId);
    };
  };
}

// Middleware для проверки доступа к аналитике
export function requireAnalyticsAccess() {
  return function(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context: AuthContext): Promise<NextResponse> => {
      if (!roleService.canViewAnalytics(context.role)) {
        return NextResponse.json(
          { 
            error: 'Недостаточно прав доступа к аналитике',
            currentRole: context.role
          },
          { status: 403 }
        );
      }

      return await handler(req, context);
    };
  };
}

// Middleware для проверки доступа к шаблонам
export function requireTemplateAccess(action: 'create' | 'read' | 'update' | 'delete') {
  return function(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context: AuthContext): Promise<NextResponse> => {
      if (!roleService.canManageTemplates(context.role, action)) {
        return NextResponse.json(
          { 
            error: 'Недостаточно прав доступа к шаблонам',
            requiredAction: action,
            currentRole: context.role
          },
          { status: 403 }
        );
      }

      return await handler(req, context);
    };
  };
}

// Middleware для проверки лимитов
export function requireLimitCheck(limitType: 'quotes_per_day' | 'quotes_per_month') {
  return function(handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return async (req: NextRequest, context: AuthContext): Promise<NextResponse> => {
      const restrictions = roleService.getRoleRestrictions(context.role);
      
      if (limitType === 'quotes_per_day' && restrictions.maxQuotesPerDay !== undefined) {
        const todayQuotes = await getQuotesCountForUser(context.userId, 'today');
        if (todayQuotes >= restrictions.maxQuotesPerDay) {
          return NextResponse.json(
            { 
              error: 'Превышен дневной лимит создания КП',
              limit: restrictions.maxQuotesPerDay,
              current: todayQuotes
            },
            { status: 429 }
          );
        }
      }

      return await handler(req, context);
    };
  };
}

// Вспомогательные функции (заглушки)
async function validateToken(token: string): Promise<{ id: string; role: Role } | null> {
  // Здесь должна быть проверка JWT токена
  // Пока возвращаем заглушку
  return {
    id: 'user-123',
    role: 'manager' as Role
  };
}

async function getQuoteById(quoteId: string): Promise<{ id: string; status: string } | null> {
  // Здесь должен быть запрос к базе данных
  // Пока возвращаем заглушку
  return {
    id: quoteId,
    status: 'draft'
  };
}

async function getQuotesCountForUser(userId: string, period: 'today' | 'month'): Promise<number> {
  // Здесь должен быть запрос к базе данных
  // Пока возвращаем заглушку
  return 0;
}

// Утилиты для проверки прав в компонентах
export function usePermissions(role: Role) {
  return {
    canCreateQuotes: roleService.hasPermission(role, 'quotes.create'),
    canReadQuotes: roleService.hasPermission(role, 'quotes.read'),
    canUpdateQuotes: roleService.hasPermission(role, 'quotes.update'),
    canDeleteQuotes: roleService.hasPermission(role, 'quotes.delete'),
    canExportQuotes: roleService.hasPermission(role, 'quotes.export'),
    canChangeQuoteStatus: roleService.hasPermission(role, 'quotes.change_status'),
    canManageTemplates: roleService.hasPermission(role, 'templates.create'),
    canViewAnalytics: roleService.hasPermission(role, 'analytics.read'),
    canManageUsers: roleService.hasPermission(role, 'users.manage'),
    canManageSettings: roleService.hasPermission(role, 'settings.manage'),
    
    // Специфичные проверки
    canAccessQuote: (status: string, action: 'read' | 'update' | 'delete' | 'change_status') => 
      roleService.canAccessQuote(role, status, action),
    canExportQuote: (status: string) => 
      roleService.canExportQuote(role, status),
    canManageRole: (targetRole: Role) => 
      roleService.canManageRole(role, targetRole),
    getManageableRoles: () => 
      roleService.getManageableRoles(role),
    getRestrictions: () => 
      roleService.getRoleRestrictions(role)
  };
}
