// lib/notifications/status-notifications.ts
// Система уведомлений при изменении статусов документов

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
    'CONFIRMED': {
      recipients: ['executor'],
      message: 'Заказ подтвержден.'
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
  console.log('📧 sendStatusNotification вызвана:', {
    documentId,
    documentType,
    documentNumber,
    oldStatus,
    newStatus,
    clientId
  });

  const notificationConfig = STATUS_NOTIFICATIONS[documentType as keyof typeof STATUS_NOTIFICATIONS];
  if (!notificationConfig) {
    console.warn('⚠️ Нет конфигурации уведомлений для типа документа:', documentType);
    return;
  }
  
  if (!notificationConfig[newStatus as keyof typeof notificationConfig]) {
    console.warn('⚠️ Нет конфигурации уведомлений для статуса:', { documentType, newStatus });
    return;
  }
  
  const config = notificationConfig[newStatus as keyof typeof notificationConfig];
  console.log('📋 Конфигурация уведомления:', config);
  
  // Импортируем настоящую функцию из lib/notifications
  const { notifyUsersByRole } = await import('@/lib/notifications');
  
  for (const recipient of config.recipients) {
    console.log(`📤 Отправка уведомления получателю: ${recipient}`);
    
    if (recipient === 'client') {
      // Клиенты не заходят в систему, пропускаем уведомление
      console.log(`ℹ️ Уведомление клиенту ${clientId}: ${config.message} (пропущено, клиенты не заходят в систему)`);
    } else if (recipient === 'complectator') {
      console.log('👥 Отправка уведомления всем COMPLECTATOR');
      await notifyUsersByRole('COMPLECTATOR', {
        clientId: clientId || undefined,
        documentId,
        type: `${documentType}:${newStatus}`, // Включаем статус в type для правильной дедубликации
        title: `${config.message} [${documentNumber}]`,
        message: `${config.message} Документ: ${documentNumber}`
      });
    } else if (recipient === 'executor') {
      console.log('👥 Отправка уведомления всем EXECUTOR');
      await notifyUsersByRole('EXECUTOR', {
        clientId: clientId || undefined,
        documentId,
        type: `${documentType}:${newStatus}`, // Включаем статус в type для правильной дедубликации
        title: `${config.message} [${documentNumber}]`,
        message: `${config.message} Документ: ${documentNumber}`
      });
    }
  }
  
  console.log('✅ sendStatusNotification завершена');
}
