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
 * Один и тот же Order должен иметь одинаковый статус везде
 */
export function getOrderDisplayStatus(orderStatus: string): string {
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
 * Получает статус для фильтрации комплектатора на основе статуса Order
 */
export function getOrderFilterStatusForComplectator(orderStatus: string): 'Черновик' | 'Отправлен' | 'Оплачен/Заказ' | 'Отменен' {
  // Статусы исполнителя попадают в фильтр "Оплачен/Заказ"
  const executorStatuses = ['NEW_PLANNED', 'UNDER_REVIEW', 'AWAITING_MEASUREMENT', 'AWAITING_INVOICE', 'COMPLETED'];
  if (executorStatuses.includes(orderStatus)) {
    return 'Оплачен/Заказ';
  }
  
  // Статусы комплектатора маппятся напрямую
  const complectatorStatusMap: Record<string, 'Черновик' | 'Отправлен' | 'Оплачен/Заказ' | 'Отменен'> = {
    'DRAFT': 'Черновик',
    'SENT': 'Отправлен',
    'PAID': 'Оплачен/Заказ',
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

