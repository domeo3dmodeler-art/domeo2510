# План реализации улучшений конструктора

## Анализ текущих проблем

### 1. Навигация
- **Проблема**: 6 панелей с неясным назначением
- **Решение**: Объединить в 4 логические группы с вкладками
- **Статус**: ✅ Реализовано в `ImprovedSidebar.tsx`

### 2. Функциональность
- **Проблема**: Многие функции не работают
- **Решение**: Поэтапное исправление критичных функций
- **Статус**: 🔄 В процессе

### 3. UX/UI
- **Проблема**: Неинтуитивный интерфейс
- **Решение**: Улучшенная навигация с поиском и группировкой
- **Статус**: ✅ Реализовано

## Реализованные улучшения

### ✅ Новая навигация
- **4 основные вкладки**: Элементы, Товары, Интерактив, Структура
- **Логическая группировка**: По назначению и типу
- **Поиск элементов**: Быстрый поиск по названию и описанию
- **Иконки и цвета**: Визуальное различие вкладок

### ✅ Улучшенная структура
- **Элементы**: Базовые компоненты (текст, изображения, кнопки)
- **Товары**: Все что связано с каталогом
- **Интерактив**: Калькуляторы, формы, конфигураторы
- **Структура**: Слои, страницы, настройки

## Следующие шаги

### Этап 1: Базовые функции (1-2 дня)
```typescript
// 1. Удаление элементов
const handleDeleteElement = (elementId: string) => {
  setElements(prev => prev.filter(el => el.id !== elementId));
  setSelectedElementId(null);
};

// 2. Редактирование текста
const handleTextEdit = (elementId: string, newText: string) => {
  setElements(prev => prev.map(el => 
    el.id === elementId ? { ...el, props: { ...el.props, content: newText } } : el
  ));
};

// 3. Изменение размеров
const handleResize = (elementId: string, newSize: {width: number, height: number}) => {
  setElements(prev => prev.map(el => 
    el.id === elementId ? { ...el, style: { ...el.style, ...newSize } } : el
  ));
};
```

### Этап 2: Система истории (1 день)
```typescript
interface HistoryState {
  elements: Element[];
  timestamp: number;
  action: string;
}

const useHistory = () => {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const undo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setElements(history[currentIndex - 1].elements);
    }
  };
  
  const redo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setElements(history[currentIndex + 1].elements);
    }
  };
  
  const addToHistory = (action: string) => {
    const newState = { elements: [...elements], timestamp: Date.now(), action };
    setHistory(prev => [...prev.slice(0, currentIndex + 1), newState]);
    setCurrentIndex(prev => prev + 1);
  };
};
```

### Этап 3: Сохранение проектов (1 день)
```typescript
interface Project {
  id: string;
  name: string;
  elements: Element[];
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

const useProjectManager = () => {
  const saveProject = async (project: Project) => {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const existingIndex = projects.findIndex((p: Project) => p.id === project.id);
    
    if (existingIndex >= 0) {
      projects[existingIndex] = { ...project, updatedAt: new Date() };
    } else {
      projects.push(project);
    }
    
    localStorage.setItem('projects', JSON.stringify(projects));
  };
  
  const loadProject = async (projectId: string) => {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    return projects.find((p: Project) => p.id === projectId);
  };
  
  const listProjects = async () => {
    return JSON.parse(localStorage.getItem('projects') || '[]');
  };
};
```

### Этап 4: Экспорт (2-3 дня)
```typescript
const exportToHTML = (elements: Element[]) => {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Сгенерированная страница</title>
    <style>
        ${generateCSS(elements)}
    </style>
</head>
<body>
    ${generateHTML(elements)}
</body>
</html>
  `;
  
  return html;
};

const generateCSS = (elements: Element[]) => {
  // Генерация CSS стилей на основе элементов
  return elements.map(el => {
    const styles = Object.entries(el.style).map(([key, value]) => 
      `${key}: ${value};`
    ).join(' ');
    
    return `.element-${el.id} { ${styles} }`;
  }).join('\n');
};

const generateHTML = (elements: Element[]) => {
  return elements.map(el => {
    switch (el.type) {
      case 'text':
        return `<div class="element-${el.id}">${el.props.content}</div>`;
      case 'image':
        return `<img class="element-${el.id}" src="${el.props.src}" alt="${el.props.alt}" />`;
      case 'button':
        return `<button class="element-${el.id}">${el.props.text}</button>`;
      default:
        return `<div class="element-${el.id}">${el.type}</div>`;
    }
  }).join('\n');
};
```

## Приоритеты

### 🔴 Критично (сначала)
1. **Удаление элементов** - базовая функция
2. **Редактирование текста** - inline редактирование
3. **Изменение размеров** - drag для изменения размера
4. **Перемещение элементов** - drag & drop на canvas

### 🟡 Важно (затем)
1. **Копирование/вставка** - Ctrl+C, Ctrl+V
2. **Отмена/повтор** - Ctrl+Z, Ctrl+Y
3. **Предварительный просмотр** - режим просмотра
4. **Сохранение проектов** - localStorage или API

### 🟢 Дополнительно (потом)
1. **Экспорт в HTML/CSS** - генерация кода
2. **Шаблоны** - готовые макеты
3. **Адаптивность** - mobile/tablet/desktop
4. **Анимации** - переходы и эффекты

## Ожидаемые результаты

### После этапа 1
- ✅ Рабочий конструктор с базовыми функциями
- ✅ Возможность создавать простые страницы
- ✅ Интуитивная навигация

### После этапа 2
- ✅ Полноценный редактор с историей
- ✅ Горячие клавиши
- ✅ Профессиональный UX

### После этапа 3
- ✅ Сохранение и загрузка проектов
- ✅ Управление проектами
- ✅ Персистентность данных

### После этапа 4
- ✅ Экспорт готовых страниц
- ✅ Генерация кода
- ✅ Production-ready функциональность

