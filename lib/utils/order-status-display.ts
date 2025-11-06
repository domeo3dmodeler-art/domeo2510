// lib/utils/order-status-display.ts
// Унифицированная логика отображения статусов Order для всех ролей
// Один и тот же Order должен иметь одинаковый статус независимо от роли

import { 
  getStatusLabel as getStatusLabelFromDocumentStatuses,
  ORDER_STATUSES_COMPLECTATOR,
  ORDER_STATUSES_EXECUTOR
} from './document-statuses';

/**
 * Получает русское название статуса Order для отображения
 * Для Исполнителя: PAID отображается как "Новый заказ" (NEW_PLANNED)
 */
export function getOrderDisplayStatus(orderStatus: string, userRole?: string): string {
  // Для Исполнителя: PAID отображается как "Новый заказ"
  if (userRole === 'executor' && orderStatus === 'PAID') {
    return ORDER_STATUSES_EXECUTOR.NEW_PLANNED.label;
  }
  
  // Сначала проверяем статусы исполнителя
  const executorLabel = getStatusLabelFromDocumentStatuses(orderStatus, 'order_executor');
  if (executorLabel !== orderStatus) {
    return executorLabel;
  }
  
  // Если не найден, проверяем статусы комплектатора
  const complectatorLabel = getStatusLabelFromDocumentStatuses(orderStatus, 'order_complectator');
  if (complectatorLabel !== orderStatus) {
    return complectatorLabel;
  }
  
  // Если не найден, возвращаем как есть
  return orderStatus;
}

/**
 * Получает статус для фильтрации/отображения в UI Исполнителя
 * PAID маппится в NEW_PLANNED для Исполнителя
 */
export function getExecutorOrderStatus(orderStatus: string): string {
  // Для Исполнителя: PAID отображается как NEW_PLANNED
  if (orderStatus === 'PAID') {
    return 'NEW_PLANNED';
  }
  return orderStatus;
}

/**
 * Получает статус для фильтрации комплектатора на основе статуса Order
 */
export function getOrderFilterStatusForComplectator(orderStatus: string): 'Черновик' | 'Счет выставлен' | 'Счет оплачен' | 'Отменен' {
  // Статусы исполнителя попадают в фильтр "Счет оплачен"
  const executorStatuses = ['NEW_PLANNED', 'UNDER_REVIEW', 'AWAITING_MEASUREMENT', 'AWAITING_INVOICE', 'COMPLETED'];
  if (executorStatuses.includes(orderStatus)) {
    return 'Счет оплачен';
  }
  
  // Статусы комплектатора маппятся напрямую
  const complectatorStatusMap: Record<string, 'Черновик' | 'Счет выставлен' | 'Счет оплачен' | 'Отменен'> = {
    'DRAFT': 'Черновик',
    'SENT': 'Счет выставлен',
    'PAID': 'Счет оплачен',
    'CANCELLED': 'Отменен'
  };
  
  return complectatorStatusMap[orderStatus] || 'Черновик';
}

/**
 * Проверяет, является ли статус Order статусом исполнителя
 */
export function isExecutorOrderStatus(status: string): boolean {
  return ['NEW_PLANNED', 'UNDER_REVIEW', 'AWAITING_MEASUREMENT', 'AWAITING_INVOICE', 'COMPLETED'].includes(status);
}

/**
 * Проверяет, является ли статус Order статусом комплектатора
 */
export function isComplectatorOrderStatus(status: string): boolean {
  return ['DRAFT', 'SENT', 'PAID', 'CANCELLED'].includes(status);
}

