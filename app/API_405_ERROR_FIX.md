# 🔧 Исправление ошибки 405 Method Not Allowed

## 🎯 **Проблема найдена и исправлена!**

### **❌ Ошибка:**
```
GET /api/catalog/properties/unique-values?categoryIds=...&propertyNames=... 405 in 193ms
HTTP error! status: 405
```

### **🔍 Причина:**
- API endpoint `/api/catalog/properties/unique-values` поддерживал только **POST** запросы
- PropertyFilter отправлял **GET** запрос с параметрами в URL
- Сервер возвращал 405 Method Not Allowed

### **✅ Исправление:**
1. **Добавлена поддержка GET запросов** в API endpoint
2. **Парсинг параметров из URL** вместо JSON тела запроса
3. **Сохранена обратная совместимость** с POST запросами

### **🔧 Что изменено:**

#### **GET метод (новый):**
```javascript
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const categoryIdsParam = url.searchParams.getAll('categoryIds');
  const propertyNamesParam = url.searchParams.getAll('propertyNames');
  
  const categoryIds = categoryIdsParam;
  const propertyNames = propertyNamesParam;
  // ... остальная логика
}
```

#### **POST метод (сохранен):**
```javascript
export async function POST(request: NextRequest) {
  const { categoryIds, propertyNames } = await request.json();
  // ... существующая логика
}
```

## 🚀 **Как проверить исправление:**

1. **Обновите страницу** в браузере (F5)
2. **Откройте консоль** (F12 → Console)
3. **Добавьте PropertyFilter** и настройте его
4. **Посмотрите на блок** - теперь должен показывать значения свойства

### **Ожидаемые логи:**
```
PropertyFilter: propertyName уже установлен: Domeo_Стиль Web
PropertyFilter: Запрос к API: /api/catalog/properties/unique-values?categoryIds=...&propertyNames=...
PropertyFilter: Ответ API: {success: true, uniqueValues: {...}}
PropertyFilter: Найдены значения свойства: ["Скрытая", "Современная", "Классическая"]
```

### **Ожидаемые HTTP запросы:**
```
GET /api/catalog/properties/unique-values?categoryIds=cmg50xcgs001cv7mn0tdyk1wo&propertyNames=Domeo_Стиль+Web 200 in XXXms
```

## 🎉 **Результат:**
PropertyFilter должен теперь успешно загружать и отображать значения свойства!

**Попробуйте сейчас!** 🔥

