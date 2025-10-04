# 🔧 Настройка системы для работы с реальными данными

## ⚠️ **Важно: Это демо-версия!**

Вы правы - показанные данные были примерами/заглушками. Для работы с вашими реальными данными нужно выполнить следующие шаги:

## 📋 **Требования для реальной работы:**

### **1. Установить библиотеку xlsx для парсинга Excel файлов**
```bash
npm install xlsx
```

### **2. Настроить подключение к базе данных (PostgreSQL/MySQL)**
```bash
# Для PostgreSQL
npm install pg @types/pg

# Для MySQL  
npm install mysql2 @types/mysql2
```

### **3. Создать таблицы для хранения товаров и истории импортов**
```sql
-- Таблица товаров
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  supplier_sku VARCHAR(255) UNIQUE NOT NULL,
  model VARCHAR(255),
  style VARCHAR(255),
  finish VARCHAR(255),
  color VARCHAR(255),
  width INTEGER,
  height INTEGER,
  price_rrc DECIMAL(10,2),
  photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории импортов
CREATE TABLE import_history (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255),
  rows_imported INTEGER,
  rows_total INTEGER,
  errors INTEGER,
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **4. Реализовать валидацию данных**
- Проверка обязательных полей
- Валидация форматов данных
- Проверка уникальности артикулов

### **5. Добавить обработку ошибок**
- Логирование ошибок
- Возврат детальной информации об ошибках
- Rollback при критических ошибках

## 🚀 **Пошаговая настройка:**

### **Шаг 1: Установка зависимостей**
```bash
cd app
npm install xlsx pg @types/pg
```

### **Шаг 2: Настройка базы данных**
Создайте файл `.env.local`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/domeo_doors"
JWT_SECRET="your-secret-key"
```

### **Шаг 3: Обновление API импорта**
Замените демо-код в `app/api/admin/import/doors/route.ts` на реальную обработку:

```typescript
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    // Читаем файл
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Обрабатываем данные
    const products = data.map(row => ({
      supplier_sku: row['Артикул поставщика'],
      model: row['Модель'],
      style: row['Стиль'],
      finish: row['Покрытие'],
      color: row['Цвет'],
      width: parseInt(row['Ширина']),
      height: parseInt(row['Высота']),
      price_rrc: parseFloat(row['РРЦ']),
      photo_url: row['Фото']
    }));
    
    // Сохраняем в базу данных
    const result = await prisma.product.createMany({
      data: products,
      skipDuplicates: true
    });
    
    return NextResponse.json({
      message: "Файл успешно обработан",
      imported: result.count,
      products: products
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Ошибка обработки файла" },
      { status: 500 }
    );
  }
}
```

### **Шаг 4: Обновление API статистики**
Замените демо-код в `app/api/admin/import/doors/stats/route.ts`:

```typescript
export async function GET(req: NextRequest) {
  try {
    const totalImports = await prisma.importHistory.count();
    const lastImport = await prisma.importHistory.findFirst({
      orderBy: { import_date: 'desc' }
    });
    
    return NextResponse.json({
      total_imports: totalImports,
      last_import: lastImport,
      demo_mode: false
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Ошибка получения статистики" },
      { status: 500 }
    );
  }
}
```

## 📊 **Текущий статус:**

- ✅ **API структура**: Готова
- ✅ **Интерфейс**: Работает
- ✅ **Авторизация**: Настроена
- ❌ **Парсер файлов**: Нужна библиотека xlsx
- ❌ **База данных**: Нужна настройка
- ❌ **Валидация**: Нужна реализация

## 🎯 **Следующие шаги:**

1. **Установите зависимости** (xlsx, база данных)
2. **Настройте базу данных** (PostgreSQL/MySQL)
3. **Обновите API** для реальной обработки
4. **Протестируйте** с вашими файлами
5. **Настройте валидацию** и обработку ошибок

## 💡 **Рекомендации:**

- Начните с простого CSV файла для тестирования
- Добавьте логирование для отладки
- Создайте резервные копии данных
- Настройте мониторинг импортов

**После выполнения этих шагов система будет готова к работе с вашими реальными данными!** 🚀
