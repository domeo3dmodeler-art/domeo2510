// lib/notifications/status-notifications.ts
// Система уведомлений при изменении статусов документов

import { logger } from '../logging/logger';

export const STATUS_NOTIFICATIONS = {
  quote: {
    'SENT': {
      recipients: ['client'],
      message: 'Вам отправлено коммерческое предложение'
    },
    'ACCEPTED': {
      recipients: ['complectator'],
      message: 'Клиент принял коммерческое предложение'
    },
    'REJECTED': {
      recipients: ['complectator'],
      message: 'Клиент отклонил коммерческое предложение'
    }
  },
  invoice: {
    'SENT': {
      recipients: ['client'],
      message: 'Вам отправлен счет на оплату'
    },
    'PAID': {
      recipients: ['executor'],
      message: 'Счет оплачен. Вы можете создать заказ у поставщика.'
    },
    'ORDERED': {
      recipients: ['complectator'],
      message: 'Заказ размещен у поставщика.'
    },
    'RECEIVED_FROM_SUPPLIER': {
      recipients: ['complectator'],
      message: 'Товар получен от поставщика.'
    },
    'COMPLETED': {
      recipients: ['complectator', 'client'],
      message: 'Заказ выполнен.'
    }
  },
  order: {
    'PAID': {
      recipients: ['executor', 'manager'],
      message: 'Заказ оплачен.'
    },
    'UNDER_REVIEW': {
      recipients: ['complectator', 'manager'],
      message: 'Заказ переведен на проверку.'
    },
    'AWAITING_MEASUREMENT': {
      recipients: ['complectator', 'manager'],
      message: 'Заказ ожидает замера.'
    },
    'AWAITING_INVOICE': {
      recipients: ['complectator', 'manager'],
      message: 'Заказ ожидает счета.'
    },
    'COMPLETED': {
      recipients: ['complectator', 'client', 'manager'],
      message: 'Заказ выполнен.'
    },
    'CANCELLED': {
      recipients: ['complectator', 'manager'],
      message: 'Заказ отменен.'
    }
  },
  supplier_order: {
    'ORDERED': {
      recipients: ['complectator'],
      message: 'Заказ размещен у поставщика.'
    },
    'RECEIVED_FROM_SUPPLIER': {
      recipients: ['complectator'],
      message: 'Товар получен от поставщика.'
    },
    'COMPLETED': {
      recipients: ['complectator'],
      message: 'Заказ выполнен поставщиком.'
    }
  }
};

export async function sendStatusNotification(
  documentId: string,
  documentType: string,
  documentNumber: string,
  oldStatus: string,
  newStatus: string,
  clientId: string
) {
  logger.debug('sendStatusNotification вызвана', 'status-notifications', {
    documentId,
    documentType,
    documentNumber,
    oldStatus,
    newStatus,
    clientId
  });

  const notificationConfig = STATUS_NOTIFICATIONS[documentType as keyof typeof STATUS_NOTIFICATIONS];
  if (!notificationConfig) {
    logger.warn('Нет конфигурации уведомлений для типа документа', 'status-notifications', { documentType });
    return;
  }
  
  if (!notificationConfig[newStatus as keyof typeof notificationConfig]) {
    logger.warn('Нет конфигурации уведомлений для статуса', 'status-notifications', { documentType, newStatus });
    return;
  }
  
  const config = notificationConfig[newStatus as keyof typeof notificationConfig];
  logger.debug('Конфигурация уведомления', 'status-notifications', { config, documentType, newStatus });
  
  // Импортируем настоящую функцию из lib/notifications
  const { notifyUsersByRole } = await import('@/lib/notifications');
  
  for (const recipient of config.recipients) {
    logger.debug('Отправка уведомления получателю', 'status-notifications', { recipient, documentId, documentType, newStatus });
    
    if (recipient === 'client') {
      // Клиенты не заходят в систему, пропускаем уведомление
      logger.debug('Уведомление клиенту (пропущено, клиенты не заходят в систему)', 'status-notifications', { clientId, message: config.message });
    } else if (recipient === 'complectator') {
      logger.debug('Отправка уведомления всем COMPLECTATOR', 'status-notifications', { documentId, documentType, newStatus });
      await notifyUsersByRole('COMPLECTATOR', {
        clientId: clientId || undefined,
        documentId,
        type: `${documentType}:${newStatus}`, // Включаем статус в type для правильной дедубликации
        title: `${config.message} [${documentNumber}]`,
        message: `${config.message} Документ: ${documentNumber}`
      });
    } else if (recipient === 'executor') {
      logger.debug('Отправка уведомления всем EXECUTOR', 'status-notifications', { documentId, documentType, newStatus });
      await notifyUsersByRole('EXECUTOR', {
        clientId: clientId || undefined,
        documentId,
        type: `${documentType}:${newStatus}`, // Включаем статус в type для правильной дедубликации
        title: `${config.message} [${documentNumber}]`,
        message: `${config.message} Документ: ${documentNumber}`
      });
    } else if (recipient === 'manager') {
      logger.debug('Отправка уведомления всем MANAGER', 'status-notifications', { documentId, documentType, newStatus });
      await notifyUsersByRole('MANAGER', {
        clientId: clientId || undefined,
        documentId,
        type: `${documentType}:${newStatus}`, // Включаем статус в type для правильной дедубликации
        title: `${config.message} [${documentNumber}]`,
        message: `${config.message} Документ: ${documentNumber}`
      });
    }
  }
  
  logger.debug('sendStatusNotification завершена', 'status-notifications', { documentId, documentType, newStatus });
}
