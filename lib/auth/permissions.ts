// lib/auth/permissions.ts
// Проверка прав доступа согласно правилам системы

import { UserRole, Permission, getRolePermissions } from './roles';

export function canUserPerformAction(
  userRole: UserRole,
  action: string,
  documentType?: string,
  documentStatus?: string,
  documentCreatorId?: string,
  userId?: string
): boolean {
  const permissions = getRolePermissions(userRole);
  
  // Базовые проверки прав
  if (!permissions.includes(action as Permission)) {
    return false;
  }
  
  // Дополнительные проверки по типу документа
  if (documentType && documentStatus) {
    return canUserModifyDocument(userRole, documentType, documentStatus);
  }
  
  // Проверка авторства для удаления
  if (action === 'DELETE' && documentCreatorId && userId) {
    return canUserDeleteDocument(userRole, documentCreatorId, userId);
  }
  
  return true;
}

function canUserModifyDocument(
  userRole: UserRole,
  documentType: string,
  documentStatus: string
): boolean {
  // Только черновики можно редактировать
  if (documentStatus !== 'DRAFT') {
    return false;
  }
  
  // COMPLECTATOR не может редактировать заказы поставщиков
  if (userRole === UserRole.COMPLECTATOR && documentType === 'supplier_order') {
    return false;
  }
  
  // EXECUTOR может работать только с заказами поставщиков
  if (userRole === UserRole.EXECUTOR && documentType !== 'supplier_order') {
    return false;
  }
  
  return true;
}

function canUserDeleteDocument(
  userRole: UserRole,
  documentCreatorId: string,
  userId: string
): boolean {
  // ADMIN может удалять все документы
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  
  // Остальные пользователи могут удалять только свои документы
  return documentCreatorId === userId;
}

// Проверка прав на создание документов
export function canUserCreateDocument(
  userRole: UserRole,
  documentType: string
): boolean {
  // Неавторизованные пользователи не могут создавать документы
  if (!userRole) {
    return false;
  }

  switch (documentType) {
    case 'quote':
    case 'invoice':
    case 'order':
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
    
    case 'supplier_order':
      return userRole === UserRole.ADMIN || userRole === UserRole.EXECUTOR;
    
    default:
      return false;
  }
}

// Проверка прав на редактирование клиентов
export function canUserEditClient(userRole: UserRole): boolean {
  // Неавторизованные пользователи не могут редактировать клиентов
  if (!userRole) {
    return false;
  }
  
  return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
}

// Проверка прав на удаление клиентов
export function canUserDeleteClient(userRole: UserRole): boolean {
  // Неавторизованные пользователи не могут удалять клиентов
  if (!userRole) {
    return false;
  }
  
  return userRole === UserRole.ADMIN;
}

// Проверка прав на изменение статусов
// ВАЖНО: Статусы есть только у Order и SupplierOrder. Invoice и Quote не имеют статусов.
export function canUserChangeStatus(
  userRole: UserRole | string,
  documentType: string,
  currentStatus?: string,
  newStatus?: string
): boolean {
  // Неавторизованные пользователи не могут изменять статусы
  if (!userRole) {
    return false;
  }

  // Нормализуем роль к строке для сравнения (enum или строка -> строка)
  const roleStr = String(userRole).toLowerCase();

  switch (documentType) {
    case 'quote':
    case 'invoice':
      // Invoice и Quote не имеют статусов
      return false;
    
    case 'order':
      // Комплектатор может менять Order только ДО PAID включительно
      // Может перевести PAID → UNDER_REVIEW или CANCELLED, но не может изменять UNDER_REVIEW обратно
      if (roleStr === 'complectator') {
        // Если текущий статус - статус исполнителя, комплектатор не может его изменить
        const executorStatuses = ['NEW_PLANNED', 'UNDER_REVIEW', 'AWAITING_MEASUREMENT', 'AWAITING_INVOICE', 'COMPLETED'];
        if (currentStatus && executorStatuses.includes(currentStatus)) {
          // Исключение: если комплектатор переводит PAID → UNDER_REVIEW, это разрешено
          // Но после установки UNDER_REVIEW, комплектатор не может его изменить
          return false;
        }
        // Комплектатор может изменять статусы DRAFT, SENT, PAID
        // Может перевести PAID → UNDER_REVIEW или CANCELLED
        if (currentStatus === 'PAID' && newStatus === 'UNDER_REVIEW') {
          return true; // Разрешаем перевод PAID → UNDER_REVIEW
        }
        if (currentStatus === 'PAID' && newStatus === 'CANCELLED') {
          return true; // Разрешаем отмену
        }
        // Для остальных переходов проверяем, что текущий статус не статус исполнителя
        return !currentStatus || !executorStatuses.includes(currentStatus);
      }
      // Руководитель не может изменять статусы (только просмотр)
      if (roleStr === 'manager' || roleStr === 'руководитель') {
        return false;
      }
      return roleStr === 'admin' || roleStr === 'executor' || roleStr === 'complectator';
    
    case 'supplier_order':
      return roleStr === 'admin' || roleStr === 'executor';
    
    default:
      return false;
  }
}
