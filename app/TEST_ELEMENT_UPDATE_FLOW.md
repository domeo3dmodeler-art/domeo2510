# 🔧 Тестирование потока обновления элемента

## Добавленные логи для диагностики

### В `PropertyFilter.tsx`:
1. При рендере: `PropertyFilter [element-id]: Рендер. element.props.propertyName: [значение]`
2. В useEffect: `PropertyFilter [element-id]: useEffect triggered. element.props.propertyName: [значение]`
3. При изменении: `PropertyFilter [element-id]: handleValueChange. element.props.propertyName: [значение]`

### В `PropertiesPanel.tsx`:
4. При вызове onPropertiesChange: `🚨 PropertiesPanel: onPropertiesChange ВЫЗВАН!`
5. При вызове handleElementPropChange: `🚨 PropertiesPanel: handleElementPropChange вызван!`
6. При вызове onUpdateElement: `🚨 PropertiesPanel: onUpdateElement вызван!`

### В `ProductPropertiesSelector.tsx`:
7. При выборе свойства: `🚨 ProductPropertiesSelector: toggleProperty вызван!`

### В `PageBuilder.tsx`:
8. При вызове handleUpdateElement: `🚨 PageBuilder: handleUpdateElement вызван!`
9. После обновления документа: `🚨 PageBuilder: Документ обновлен!`

## Инструкции по тестированию

### Шаг 1: Откройте конструктор
1. Перейдите на `http://localhost:3000/professional-builder`
2. Откройте DevTools (F12) → Console
3. Очистите консоль (Ctrl+L)

### Шаг 2: Создайте фильтр
1. Добавьте блок "Фильтр свойств"
2. Выберите его (он должен быть выделен синим)

### Шаг 3: Настройте фильтр
1. В правой панели выберите категорию: "Межкомнатные двери"
2. **ВАЖНО:** Выберите свойство для фильтрации (например, "Domeo_Стиль Web")

### Шаг 4: Проверьте полный поток логов
После выбора свойства в консоли должны появиться **ВСЕ** следующие логи в правильном порядке:

```
🚨 ProductPropertiesSelector: toggleProperty вызван! {propertyId: "...", newSelected: [...], categoryIds: [...]}
🚨 PropertiesPanel: onPropertiesChange ВЫЗВАН! {selectedPropertyIds: [...], availableProperties: 25, ...}
PropertiesPanel: Обновляем propertyName на: Domeo_Стиль Web
🚨 PropertiesPanel: handleElementPropChange вызван! {elementId: "...", key: "propertyName", value: "Domeo_Стиль Web", currentProps: {...}}
🚨 PropertiesPanel: onUpdateElement вызван! {elementId: "...", newProps: {...}}
🚨 PageBuilder: handleUpdateElement вызван! {elementId: "...", updates: {...}, selectedPageId: "..."}
🚨 PageBuilder: Документ обновлен! {elementId: "...", updatedElement: {...}}
PropertyFilter [element-xxx]: Рендер. element.props.propertyName: Domeo_Стиль Web
```

### Шаг 5: Протестируйте фильтрацию
1. Кликните на значение в фильтре (например, "Классика")
2. В консоли должно появиться:
```
PropertyFilter [element-xxx]: handleValueChange. element.props.propertyName: Domeo_Стиль Web value: Классика
🔗 PropertyFilter отправляет данные: {propertyName: "Domeo_Стиль Web", ...}
```

## Диагностика проблем

### ❌ **Если НЕТ логов от `ProductPropertiesSelector`:**
- Проблема в UI - свойство не выбирается
- Проверьте, что категория выбрана
- Проверьте, что свойства загружаются

### ❌ **Если НЕТ логов от `PropertiesPanel: onPropertiesChange`:**
- Проблема в передаче данных между компонентами
- Проверьте, что `onPropertiesChange` передается правильно

### ❌ **Если НЕТ логов от `PropertiesPanel: handleElementPropChange`:**
- Проблема в логике установки `propertyName`
- Код `handleElementPropChange('propertyName', property.name)` не вызывается

### ❌ **Если НЕТ логов от `PageBuilder: handleUpdateElement`:**
- Проблема в передаче `onUpdateElement` в `PropertiesPanel`
- Проверьте, что функция передается правильно

### ❌ **Если `PropertyFilter` рендерится с `undefined` после всех логов:**
- Проблема в обновлении состояния React
- Возможно, `PropertyFilter` не получает обновленные props

## Ожидаемый результат

✅ **Правильная работа:**
- Все 9 логов появляются в правильном порядке
- `PropertyFilter` рендерится с правильным `propertyName`
- При клике отправляется корректный `propertyName`

❌ **Проблемная работа:**
- Отсутствуют логи на каком-то этапе
- `PropertyFilter` рендерится с `propertyName: undefined`
- При клике отправляется `propertyName: undefined`

