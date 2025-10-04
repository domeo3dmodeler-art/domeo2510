/**
 * Русские названия блоков и их описания
 */

export interface BlockNameMapping {
  name: string;
  description: string;
  category: string;
}

export const BLOCK_NAMES: Record<string, BlockNameMapping> = {
  // Основные компоненты
  heading: {
    name: 'Заголовок',
    description: 'Заголовок страницы или секции',
    category: 'Основные компоненты'
  },
  text: {
    name: 'Текст',
    description: 'Описательный текст',
    category: 'Основные компоненты'
  },
  image: {
    name: 'Изображение',
    description: 'Фото или иллюстрация',
    category: 'Основные компоненты'
  },
  button: {
    name: 'Кнопка',
    description: 'Кнопка действия',
    category: 'Основные компоненты'
  },

  // Товарные блоки
  productConfigurator: {
    name: 'Конфигуратор товаров',
    description: 'Полный конфигуратор с фильтрами и настройкой',
    category: 'Товарные блоки'
  },
  productGrid: {
    name: 'Каталог товаров',
    description: 'Сетка товаров с фото и свойствами',
    category: 'Товарные блоки'
  },
  catalogTree: {
    name: 'Дерево каталога',
    description: 'Навигация по категориям товаров',
    category: 'Товарные блоки'
  },
  cart: {
    name: 'Корзина',
    description: 'Корзина для добавленных товаров',
    category: 'Товарные блоки'
  },

  // Продвинутые конфигураторы
  stepWizard: {
    name: 'Пошаговый мастер',
    description: 'Пошаговая конфигурация товара с прогрессом',
    category: 'Продвинутые конфигураторы'
  },
  comparisonTable: {
    name: 'Сравнение товаров',
    description: 'Таблица для сравнения характеристик товаров',
    category: 'Продвинутые конфигураторы'
  },
  priceCalculator: {
    name: 'Калькулятор цены',
    description: 'Интерактивный калькулятор с живыми ценами',
    category: 'Продвинутые конфигураторы'
  },

  // Контентные блоки
  contact: {
    name: 'Контактная форма',
    description: 'Форма обратной связи с контактной информацией',
    category: 'Контентные блоки'
  },
  accordion: {
    name: 'Аккордеон',
    description: 'Раскрывающиеся секции с контентом',
    category: 'Контентные блоки'
  },
  gallery: {
    name: 'Галерея',
    description: 'Галерея изображений с lightbox',
    category: 'Контентные блоки'
  },

  // Структура страницы
  section: {
    name: 'Секция',
    description: 'Основная секция страницы',
    category: 'Структура страницы'
  },
  spacer: {
    name: 'Отступ',
    description: 'Пространство между блоками',
    category: 'Структура страницы'
  },

};

/**
 * Получить русское название блока
 */
export function getBlockName(type: string): string {
  return BLOCK_NAMES[type]?.name || type;
}

/**
 * Получить описание блока
 */
export function getBlockDescription(type: string): string {
  return BLOCK_NAMES[type]?.description || '';
}

/**
 * Получить категорию блока
 */
export function getBlockCategory(type: string): string {
  return BLOCK_NAMES[type]?.category || 'Другие';
}

/**
 * Получить полную информацию о блоке
 */
export function getBlockInfo(type: string): BlockNameMapping {
  return BLOCK_NAMES[type] || {
    name: type,
    description: '',
    category: 'Другие'
  };
}
