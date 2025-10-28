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
      'ORDERED': 'Заказ размещен',
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
      'COMPLETED': 'Исполнен'
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
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
      'COMPLETED': 'Исполнен',
      'CANCELLED': 'Отменен'
    },
    supplier_order: {
      'PENDING': 'Ожидает',
      'ORDERED': 'Заказ размещен',
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
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
      'Заказ размещен': 'ORDERED',
      'Получен от поставщика': 'RECEIVED_FROM_SUPPLIER',
      'Исполнен': 'COMPLETED'
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
      'Получен от поставщика': 'RECEIVED_FROM_SUPPLIER',
      'Исполнен': 'COMPLETED',
      'Отменен': 'CANCELLED'
    },
    supplier_order: {
      'Ожидает': 'PENDING',
      'Заказ размещен': 'ORDERED',
      'Получен от поставщика': 'RECEIVED_FROM_SUPPLIER',
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
  const blockedStatuses = ['ORDERED', 'RECEIVED_FROM_SUPPLIER', 'COMPLETED'];
  return blockedStatuses.includes(status);
}
