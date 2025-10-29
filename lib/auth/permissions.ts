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
export function canUserChangeStatus(
  userRole: UserRole,
  documentType: string,
  documentStatus?: string
): boolean {
  // Неавторизованные пользователи не могут изменять статусы
  if (!userRole) {
    return false;
  }

  switch (documentType) {
    case 'quote':
      // КП НЕ блокируются для Комплектатора
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
    
    case 'invoice':
      // Комплектатор может менять Invoice только ДО PAID
      if (userRole === UserRole.COMPLECTATOR) {
        // После PAID, ORDERED, RECEIVED, COMPLETED - только EXECUTOR и ADMIN
        const blockedStatuses = ['PAID', 'ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
        if (documentStatus && blockedStatuses.includes(documentStatus)) {
          return false;
        }
      }
      // EXECUTOR НЕ может менять Invoice напрямую
      // Он меняет SupplierOrder, а Invoice синхронизируется автоматически
      return userRole === UserRole.ADMIN || userRole === UserRole.COMPLECTATOR;
    
    case 'order':
      return userRole === UserRole.ADMIN || userRole === UserRole.EXECUTOR;
    
    case 'supplier_order':
      return userRole === UserRole.ADMIN || userRole === UserRole.EXECUTOR;
    
    default:
      return false;
  }
}
