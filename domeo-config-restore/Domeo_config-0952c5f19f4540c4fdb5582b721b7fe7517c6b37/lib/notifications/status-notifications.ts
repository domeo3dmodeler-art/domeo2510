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
      recipients: ['complectator'],
      message: 'Клиент оплатил счет'
    },
    'IN_PRODUCTION': {
      recipients: ['executor'],
      message: 'Счет переведен в производство'
    },
    'RECEIVED_FROM_SUPPLIER': {
      recipients: ['complectator'],
      message: 'Товар получен от поставщика'
    },
    'COMPLETED': {
      recipients: ['complectator', 'client'],
      message: 'Заказ выполнен'
    }
  },
  order: {
    'CONFIRMED': {
      recipients: ['executor'],
      message: 'Заказ подтвержден'
    },
    'IN_PRODUCTION': {
      recipients: ['complectator'],
      message: 'Заказ переведен в производство'
    },
    'READY': {
      recipients: ['complectator'],
      message: 'Заказ готов к выдаче'
    },
    'COMPLETED': {
      recipients: ['complectator', 'client'],
      message: 'Заказ выполнен'
    }
  },
  supplier_order: {
    'ORDERED': {
      recipients: ['complectator'],
      message: 'Заказ размещен у поставщика'
    },
    'IN_PRODUCTION': {
      recipients: ['complectator'],
      message: 'Заказ в производстве у поставщика'
    },
    'READY': {
      recipients: ['complectator'],
      message: 'Заказ готов у поставщика'
    },
    'COMPLETED': {
      recipients: ['complectator'],
      message: 'Заказ выполнен поставщиком'
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
  const notificationConfig = STATUS_NOTIFICATIONS[documentType as keyof typeof STATUS_NOTIFICATIONS];
  if (!notificationConfig || !notificationConfig[newStatus as keyof typeof notificationConfig]) {
    return;
  }
  
  const config = notificationConfig[newStatus as keyof typeof notificationConfig];
  
  for (const recipient of config.recipients) {
    if (recipient === 'client') {
      await notifyClient(clientId, config.message, documentId);
    } else if (recipient === 'complectator') {
      await notifyUsersByRole('COMPLECTATOR', config.message, documentId);
    } else if (recipient === 'executor') {
      await notifyUsersByRole('EXECUTOR', config.message, documentId);
    }
  }
}

// Вспомогательные функции (нужно будет реализовать)
async function notifyClient(clientId: string, message: string, documentId: string) {
  // Реализация уведомления клиента
  console.log(`Уведомление клиенту ${clientId}: ${message}`);
}

async function notifyUsersByRole(role: string, message: string, documentId: string) {
  // Реализация уведомления пользователей по роли
  console.log(`Уведомление роли ${role}: ${message}`);
}
