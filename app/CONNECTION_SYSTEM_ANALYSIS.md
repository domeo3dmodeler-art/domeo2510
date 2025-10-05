# 🔍 Анализ системы связей между компонентами

## 📋 Найденные проблемы и исправления

### ❌ Проблема 1: Дублирование вызовов onConnectionData

**Описание:** В `ElementRenderer.tsx` был дублированный вызов `onConnectionData`:

```typescript
// Строка 652: Неправильный вызов
onConnectionData(element.id, { [propertyName]: value });

// Строка 655: Правильная передача в PropertyFilter
onConnectionData={onConnectionData}
```

**Проблема:** PropertyFilter сам вызывает `onConnectionData` с правильным форматом данных, но ElementRenderer перехватывал `onFilterChange` и отправлял данные в неправильном формате.

**✅ Исправление:** Убрано дублирование, оставлена только правильная передача `onConnectionData` в PropertyFilter.

### ❌ Проблема 2: Неправильный формат данных связи

**Описание:** ElementRenderer отправлял данные в формате:
```typescript
{ [propertyName]: value } // Неправильно
```

**Проблема:** Это не соответствовало ожидаемому формату в `handleConnectionData`.

**✅ Исправление:** PropertyFilter теперь отправляет данные в правильном формате:
```typescript
{
  type: 'filter',
  propertyName: element.props.propertyName,
  value: value,
  categoryIds: element.props.categoryIds
}
```

### ❌ Проблема 3: Отсутствие обработки внешних фильтров

**Описание:** PropertyFilter не реагировал на изменения в `element.props.filters` от внешних связей.

**Проблема:** Когда `handleConnectionData` обновляла `element.props.filters`, PropertyFilter не перезагружал данные с учетом новых фильтров.

**✅ Исправление:** Добавлен `useEffect` для обработки внешних фильтров:

```typescript
useEffect(() => {
  if (element.props.filters && Object.keys(element.props.filters).length > 0) {
    console.log('🔍 PropertyFilter: Получены внешние фильтры:', element.props.filters);
    
    if (element.props.filters.propertyName && element.props.filters.propertyValue) {
      // Перезагружаем данные с учетом фильтра
      setLoading(true);
      setError(null);
      setOptions([]);
      setSelectedValue('');
      loadPropertyValues();
    }
  }
}, [element.props.filters]);
```

## 🔧 Архитектура системы связей

### 1. Создание связи
```typescript
// ConnectionContextMenu → onCreateConnection
const newConnection = {
  id: `conn-${Date.now()}`,
  sourceElementId,
  targetElementId,
  connectionType: 'filter',
  isActive: true
};
```

### 2. Передача данных
```typescript
// PropertyFilter → onConnectionData
onConnectionData(element.id, {
  type: 'filter',
  propertyName: element.props.propertyName,
  value: value,
  categoryIds: element.props.categoryIds
});
```

### 3. Обработка связи
```typescript
// PageBuilder → handleConnectionData
const outgoingConnections = connections.filter(conn => 
  conn.sourceElementId === sourceElementId && conn.isActive
);

outgoingConnections.forEach(connection => {
  if (targetElement.type === 'propertyFilter') {
    const updates = {
      props: {
        ...targetElement.props,
        filters: {
          propertyName: data.propertyName,
          propertyValue: data.value,
          categoryIds: data.categoryIds
        }
      }
    };
    handleUpdateElement(connection.targetElementId, updates);
  }
});
```

### 4. Обновление целевого элемента
```typescript
// PropertyFilter → useEffect
useEffect(() => {
  if (element.props.filters && Object.keys(element.props.filters).length > 0) {
    // Перезагружаем данные с учетом фильтра
    loadPropertyValues();
  }
}, [element.props.filters]);
```

## 🧪 Тестирование

### Созданы тестовые файлы:
- `test-connections-debug.html` - Подробная диагностика
- `test-connections.html` - Интерактивный тест
- `test-page-with-connections.json` - Тестовая страница

### Ожидаемый результат:
1. **Создание связи:** Выбрать 2 PropertyFilter → Ctrl+click → правый клик → "Фильтры →"
2. **Передача данных:** Выбрать стиль в первом фильтре
3. **Синхронизация:** Второй фильтр показывает только модели этого стиля

### Логи для отслеживания:
```
🔗 PropertyFilter отправляет данные: {...}
🔗 handleConnectionData вызвана: {...}
🔗 Найдены исходящие связи: [...]
🔍 Применяем обновления к PropertyFilter: {...}
🔍 PropertyFilter: Получены внешние фильтры: {...}
```

## ✅ Статус исправлений

- [x] Исправлено дублирование вызовов onConnectionData
- [x] Исправлен формат данных связи
- [x] Добавлена обработка внешних фильтров
- [x] Созданы тестовые файлы
- [x] Очищен кэш для тестирования

## 🚀 Следующие шаги

1. Протестировать создание связи между двумя PropertyFilter
2. Проверить передачу данных при изменении значения
3. Убедиться, что целевой фильтр обновляется
4. Проверить правильность фильтрации данных

Система связей должна теперь работать корректно!
