// lib/utils/status-labels.ts

/**
 * Получает русские названия статусов для всех типов документов
 */
export function getStatusLabel(status: string, documentType: 'invoice' | 'quote' | 'order' | 'supplier_order'): string {
  const statusLabels: Record<string, Record<string, string>> = {
    invoice: {
      'DRAFT': 'Черновик',
      'SENT': 'Отправлен',
      'PAID': 'Оплачен/Заказ',
      'CANCELLED': 'Отменен',
      'IN_PRODUCTION': 'В производстве',
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
      'COMPLETED': 'Исполнен',
      'ORDERED': 'Заказ размещен'
    },
    quote: {
      'DRAFT': 'Черновик',
      'SENT': 'Отправлен',
      'ACCEPTED': 'Принят',
      'REJECTED': 'Отклонен',
      'CANCELLED': 'Отменен'
    },
    order: {
      'PENDING': 'Ожидает',
      'CONFIRMED': 'Подтвержден',
      'IN_PRODUCTION': 'В производстве',
      'READY': 'Готов',
      'COMPLETED': 'Исполнен',
      'CANCELLED': 'Отменен'
    },
    supplier_order: {
      'PENDING': 'Ожидает',
      'ORDERED': 'Заказ размещен',
      'IN_PRODUCTION': 'В производстве',
      'READY': 'Получен от поставщика',
      'COMPLETED': 'Исполнен',
      'CANCELLED': 'Отменен'
    }
  };

  return statusLabels[documentType]?.[status] || status;
}

/**
 * Получает английские статусы из русских названий
 */
export function getEnglishStatus(russianStatus: string, documentType: 'invoice' | 'quote' | 'order' | 'supplier_order'): string {
  const statusMappings: Record<string, Record<string, string>> = {
    invoice: {
      'Черновик': 'DRAFT',
      'Отправлен': 'SENT',
      'Оплачен/Заказ': 'PAID',
      'Отменен': 'CANCELLED',
      'В производстве': 'IN_PRODUCTION',
      'Получен от поставщика': 'RECEIVED_FROM_SUPPLIER',
      'Исполнен': 'COMPLETED',
      'Заказ размещен': 'ORDERED'
    },
    quote: {
      'Черновик': 'DRAFT',
      'Отправлен': 'SENT',
      'Принят': 'ACCEPTED',
      'Отклонен': 'REJECTED',
      'Отменен': 'CANCELLED'
    },
    order: {
      'Ожидает': 'PENDING',
      'Подтвержден': 'CONFIRMED',
      'В производстве': 'IN_PRODUCTION',
      'Готов': 'READY',
      'Исполнен': 'COMPLETED',
      'Отменен': 'CANCELLED'
    },
    supplier_order: {
      'Ожидает': 'PENDING',
      'Заказ размещен': 'ORDERED',
      'В производстве': 'IN_PRODUCTION',
      'Получен от поставщика': 'READY',
      'Исполнен': 'COMPLETED',
      'Отменен': 'CANCELLED'
    }
  };

  return statusMappings[documentType]?.[russianStatus] || russianStatus;
}

/**
 * Проверяет, заблокирован ли статус для ручного изменения
 */
export function isStatusBlockedForManualChange(status: string): boolean {
  const blockedStatuses = ['ORDERED', 'IN_PRODUCTION', 'READY', 'COMPLETED'];
  return blockedStatuses.includes(status);
}
