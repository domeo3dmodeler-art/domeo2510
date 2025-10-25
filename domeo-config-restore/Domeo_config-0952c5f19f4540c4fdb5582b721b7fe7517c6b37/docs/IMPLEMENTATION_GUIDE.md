# Практические рекомендации по реализации системы правил

## 🚀 Немедленные действия для улучшения системы

### 1. Добавить валидацию статусов в API

#### Создать файл `lib/validation/status-transitions.ts`:
```typescript
export const STATUS_TRANSITIONS = {
  quote: {
    'DRAFT': ['SENT', 'CANCELLED'],
    'SENT': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    'ACCEPTED': ['CANCELLED'],
    'REJECTED': ['CANCELLED'],
    'CANCELLED': []
  },
  invoice: {
    'DRAFT': ['SENT', 'CANCELLED'],
    'SENT': ['PAID', 'CANCELLED'],
    'PAID': ['IN_PRODUCTION', 'CANCELLED'],
    'IN_PRODUCTION': ['RECEIVED_FROM_SUPPLIER', 'CANCELLED'],
    'RECEIVED_FROM_SUPPLIER': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': []
  },
  order: {
    'DRAFT': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['IN_PRODUCTION', 'CANCELLED'],
    'IN_PRODUCTION': ['READY', 'CANCELLED'],
    'READY': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': []
  },
  supplier_order: {
    'PENDING': ['ORDERED', 'CANCELLED'],
    'ORDERED': ['IN_PRODUCTION', 'CANCELLED'],
    'IN_PRODUCTION': ['READY', 'CANCELLED'],
    'READY': ['COMPLETED', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': []
  }
};

export function canTransitionTo(
  documentType: string,
  currentStatus: string,
  newStatus: string
): boolean {
  const transitions = STATUS_TRANSITIONS[documentType as keyof typeof STATUS_TRANSITIONS];
  if (!transitions) return false;
  
  const allowedTransitions = transitions[currentStatus as keyof typeof transitions];
  return allowedTransitions?.includes(newStatus) || false;
}
```

### 2. Улучшить проверку прав доступа

#### Создать файл `lib/auth/permissions.ts`:
```typescript
import { UserRole, Permission } from './roles';

export function canUserPerformAction(
  userRole: UserRole,
  action: string,
  documentType?: string,
  documentStatus?: string
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
```

### 3. Улучшить систему уведомлений

#### Создать файл `lib/notifications/status-notifications.ts`:
```typescript
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
```

### 4. Добавить аудит действий

#### Создать файл `lib/audit/document-audit.ts`:
```typescript
export async function logDocumentAction(
  documentId: string,
  documentType: string,
  action: string,
  userId: string,
  oldValue?: any,
  newValue?: any,
  details?: any
) {
  try {
    await prisma.documentHistory.create({
      data: {
        document_id: documentId,
        user_id: userId,
        action,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        details: details ? JSON.stringify(details) : null,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log document action:', error);
    // Не прерываем выполнение, если не удалось записать аудит
  }
}

export async function logClientAction(
  clientId: string,
  action: string,
  userId: string,
  oldValue?: any,
  newValue?: any,
  details?: any
) {
  try {
    await prisma.clientHistory.create({
      data: {
        client_id: clientId,
        user_id: userId,
        action,
        old_value: oldValue ? JSON.stringify(oldValue) : null,
        new_value: newValue ? JSON.stringify(newValue) : null,
        details: details ? JSON.stringify(details) : null,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log client action:', error);
  }
}
```

### 5. Обновить API endpoints

#### Пример обновления `app/api/documents/[id]/status/route.ts`:
```typescript
import { canTransitionTo } from '@/lib/validation/status-transitions';
import { canUserPerformAction } from '@/lib/auth/permissions';
import { logDocumentAction } from '@/lib/audit/document-audit';
import { sendStatusNotification } from '@/lib/notifications/status-notifications';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();
    
    // Получаем пользователя из токена
    const userId = getUserIdFromToken(req);
    const userRole = getUserRoleFromToken(req);
    
    // Находим документ
    const document = await findDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 });
    }
    
    // Проверяем права доступа
    if (!canUserPerformAction(userRole, 'UPDATE', document.type, document.status)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }
    
    // Проверяем возможность перехода статуса
    if (!canTransitionTo(document.type, document.status, status)) {
      return NextResponse.json({ 
        error: 'Недопустимый переход статуса',
        details: {
          currentStatus: document.status,
          newStatus: status,
          documentType: document.type
        }
      }, { status: 400 });
    }
    
    // Сохраняем старый статус для аудита
    const oldStatus = document.status;
    
    // Обновляем документ
    const updatedDocument = await updateDocumentStatus(id, document.type, status);
    
    // Логируем действие
    await logDocumentAction(
      id,
      document.type,
      'status_change',
      userId,
      oldStatus,
      status,
      { documentNumber: document.number }
    );
    
    // Отправляем уведомления
    await sendStatusNotification(
      id,
      document.type,
      document.number,
      oldStatus,
      status,
      document.client_id
    );
    
    return NextResponse.json({
      success: true,
      document: updatedDocument
    });
    
  } catch (error) {
    console.error('Error updating document status:', error);
    return NextResponse.json(
      { error: 'Ошибка при изменении статуса документа' },
      { status: 500 }
    );
  }
}
```

## 🔧 Настройка базы данных

### Добавить таблицу для аудита клиентов:
```sql
CREATE TABLE client_history (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Добавить индексы для производительности:
```sql
CREATE INDEX idx_document_history_document_id ON document_history(document_id);
CREATE INDEX idx_document_history_user_id ON document_history(user_id);
CREATE INDEX idx_document_history_created_at ON document_history(created_at);
CREATE INDEX idx_client_history_client_id ON client_history(client_id);
CREATE INDEX idx_client_history_user_id ON client_history(user_id);
```

## 📋 Чек-лист для внедрения

### Этап 1: Базовая валидация (1-2 дня)
- [ ] Создать файл валидации статусов
- [ ] Обновить API endpoints для проверки переходов
- [ ] Добавить проверки прав доступа

### Этап 2: Система уведомлений (2-3 дня)
- [ ] Создать конфигурацию уведомлений
- [ ] Обновить существующие API для отправки уведомлений
- [ ] Протестировать уведомления для всех ролей

### Этап 3: Аудит действий (1-2 дня)
- [ ] Создать таблицы для аудита
- [ ] Добавить логирование во все критические операции
- [ ] Создать интерфейс для просмотра истории

### Этап 4: Тестирование и доработка (2-3 дня)
- [ ] Протестировать все сценарии изменения статусов
- [ ] Проверить права доступа для всех ролей
- [ ] Оптимизировать производительность

## 🎯 Ожидаемые результаты

После внедрения системы правил:

1. **Безопасность**: Все действия будут контролироваться правами доступа
2. **Аудит**: Полная история изменений документов и клиентов
3. **Уведомления**: Автоматические уведомления при изменении статусов
4. **Валидация**: Предотвращение некорректных переходов статусов
5. **Производительность**: Оптимизированные запросы с индексами

## 🚨 Важные моменты

1. **Обратная совместимость**: Все изменения должны быть совместимы с существующими данными
2. **Тестирование**: Обязательно протестировать все сценарии перед продакшеном
3. **Мониторинг**: Настроить мониторинг ошибок и производительности
4. **Документация**: Обновить документацию API и пользовательские инструкции
