# 🏗️ Архитектурный план профессионального конструктора

## 🎯 **Основные требования:**

### 1. **Связь с деревом каталога товаров**
- Основная категория (выбирается из дерева)
- Подкатегории (вложенные категории)
- Многоуровневая структура
- Связь со свойствами товаров и фото

### 2. **Система категорий**
- **Основная категория** - главная категория товаров
- **Дополнительные категории** - для расчета общей цены
- **Настройка отображения** - отдельные строки или объединение цен

### 3. **Конструкторы блоков**
- **Конструктор подбора** - какие параметры выводить
- **Конструктор фильтров** - выбор свойств для фильтрации
- **Конструктор корзины** - настройка строк КП/Счета/Заказа

## 🏗️ **Архитектура системы:**

### **Блок 1: Наименование категории**
```typescript
interface CategoryTitleBlock {
  type: 'category-title';
  categoryId: string;
  title: string;
  subtitle?: string;
  showBreadcrumbs: boolean;
  showProductCount: boolean;
}
```

### **Блок 2: Основная категория товаров**
```typescript
interface MainCategoryBlock {
  type: 'main-category';
  categoryId: string;
  subcategoryIds: string[];
  productDisplay: {
    layout: 'grid' | 'list' | 'masonry';
    columns: number;
    itemsPerPage: number;
    imageSize: 'small' | 'medium' | 'large';
    showImages: boolean;
    showPrices: boolean;
    showDescriptions: boolean;
    showProperties: string[]; // Выбранные свойства
  };
  categoryTree: CategoryTreeNode;
}
```

### **Блок 3: Подкатегории товаров**
```typescript
interface SubcategoryBlock {
  type: 'subcategory';
  parentCategoryId: string;
  subcategories: {
    id: string;
    name: string;
    productCount: number;
    image?: string;
  }[];
  layout: 'horizontal' | 'vertical' | 'grid';
  showProductCount: boolean;
}
```

### **Блок 4: Дополнительные категории**
```typescript
interface AdditionalCategoryBlock {
  type: 'additional-category';
  categoryId: string;
  pricingStrategy: 'separate' | 'combined'; // Отдельная строка или объединение
  targetMainCategory?: string; // С какой основной категорией объединять
  displaySettings: ProductDisplaySettings;
}
```

### **Блок 5: Конструктор подбора товара**
```typescript
interface ProductSelectorBlock {
  type: 'product-selector';
  categoryId: string;
  selectorProperties: {
    propertyId: string;
    propertyName: string;
    inputType: 'select' | 'radio' | 'checkbox' | 'range' | 'color';
    required: boolean;
    defaultValue?: any;
    options?: SelectOption[];
  }[];
  showPrice: boolean;
  showImage: boolean;
  showDescription: boolean;
}
```

### **Блок 6: Конструктор фильтров**
```typescript
interface FilterConstructorBlock {
  type: 'filter-constructor';
  categoryId: string;
  filterProperties: {
    propertyId: string;
    propertyName: string;
    filterType: 'range' | 'select' | 'multiselect' | 'checkbox';
    showInFilter: boolean;
    position: number;
  }[];
  layout: 'horizontal' | 'vertical' | 'sidebar';
  showApplyButton: boolean;
  showClearButton: boolean;
}
```

### **Блок 7: Блок изображения товара**
```typescript
interface ProductImageBlock {
  type: 'product-image';
  imageSettings: {
    size: 'small' | 'medium' | 'large' | 'fullscreen';
    aspectRatio: 'square' | 'landscape' | 'portrait' | 'auto';
    showGallery: boolean;
    showZoom: boolean;
    showThumbnails: boolean;
  };
  targetProduct?: string; // Привязка к конкретному товару
}
```

### **Блок 8: Корзина с экспортами**
```typescript
interface CartExportBlock {
  type: 'cart-export';
  exportSettings: {
    quote: {
      enabled: boolean;
      template: string;
      showPrices: boolean;
      showTotals: boolean;
    };
    invoice: {
      enabled: boolean;
      template: string;
      showPrices: boolean;
      showTaxes: boolean;
      showTotals: boolean;
    };
    order: {
      enabled: boolean;
      template: string;
      showPrices: boolean;
      showDelivery: boolean;
      showTotals: boolean;
    };
  };
  pricingRules: {
    combineAdditionalCategories: boolean;
    showSeparateLines: boolean;
    calculateTotal: boolean;
  };
}
```

### **Блок 9: Текстовый блок**
```typescript
interface TextBlock {
  type: 'text';
  content: string;
  formatting: {
    fontSize: string;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    textAlign: 'left' | 'center' | 'right';
    color: string;
    backgroundColor: string;
    padding: string;
    margin: string;
  };
}
```

## 🤖 **AI инструменты:**

### **1. Автоматическое предложение блоков**
```typescript
interface AIBlockSuggestion {
  suggestion: {
    blockType: string;
    position: { x: number; y: number };
    settings: Partial<BlockSettings>;
    reason: string; // Почему AI предлагает этот блок
  }[];
}
```

### **2. Оптимизация UX**
```typescript
interface AIUXOptimization {
  suggestions: {
    type: 'layout' | 'content' | 'navigation';
    description: string;
    impact: 'low' | 'medium' | 'high';
    implementation: string;
  }[];
}
```

### **3. Автоматическое создание категорий**
```typescript
interface AICategoryBuilder {
  generateCategoryStructure: (products: Product[]) => CategoryTree;
  suggestProductGrouping: (products: Product[]) => ProductGroup[];
  optimizeCategoryNames: (categories: Category[]) => Category[];
}
```

### **4. Умная фильтрация**
```typescript
interface AIFilterOptimization {
  suggestFilterProperties: (products: Product[]) => Property[];
  optimizeFilterOrder: (filters: Filter[]) => Filter[];
  predictUserPreferences: (userBehavior: UserBehavior[]) => FilterPreferences;
}
```

## 🗂️ **Структура данных:**

### **Категория товаров**
```typescript
interface Category {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  properties: Property[];
  products: Product[];
  image?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### **Свойство товара**
```typescript
interface Property {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'color' | 'boolean';
  values?: string[];
  unit?: string;
  required: boolean;
  filterable: boolean;
  displayable: boolean;
  categoryId: string;
}
```

### **Товар**
```typescript
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  properties: { [propertyId: string]: any };
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔄 **Логика работы:**

### **1. Связь категорий**
- Основная категория → Подкатегории → Товары
- Дополнительные категории → Связь с основной
- Настройка отображения цен (отдельно/объединенно)

### **2. Конструктор параметров**
- Выбор свойств из каталога
- Настройка типов ввода
- Обязательные/опциональные поля
- Значения по умолчанию

### **3. Система фильтрации**
- Выбор свойств для фильтрации
- Типы фильтров (диапазон, выбор, множественный выбор)
- Позиционирование фильтров
- Применение к товарам

### **4. Корзина и экспорты**
- Настройка отображения товаров
- Правила объединения цен
- Шаблоны экспорта (КП, Счет, Заказ)
- Расчет итоговых сумм

## 🚀 **План реализации:**

### **Этап 1: Базовая архитектура**
1. ✅ Исправлена правая панель с углубленными настройками
2. 🔄 Создание типов данных для всех блоков
3. 🔄 Реализация базовых компонентов блоков

### **Этап 2: Связь с каталогом**
1. 🔄 Интеграция с существующим каталогом товаров
2. 🔄 Реализация дерева категорий
3. 🔄 Связь свойств товаров с блоками

### **Этап 3: Конструкторы**
1. 🔄 Конструктор подбора товара
2. 🔄 Конструктор фильтров
3. 🔄 Конструктор корзины

### **Этап 4: AI инструменты**
1. 🔄 Автоматическое предложение блоков
2. 🔄 Оптимизация UX
3. 🔄 Умная фильтрация

### **Этап 5: Экспорты и интеграции**
1. 🔄 Система экспорта документов
2. 🔄 Интеграция с внешними системами
3. 🔄 Тестирование с реальными данными

## 📋 **Следующие шаги:**

1. **Создать типы данных** для всех блоков
2. **Реализовать компоненты блоков** с настройками
3. **Интегрировать с каталогом товаров**
4. **Добавить AI инструменты**
5. **Протестировать с реальными данными**

**Это профессиональная архитектура для полнофункционального конструктора страниц!** 🎨✨




