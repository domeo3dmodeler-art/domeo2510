import { BlockDefinition } from './types';

export const BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  // Контейнеры
  container: {
    type: 'container',
    name: 'Контейнер',
    category: 'layout',
    icon: '📦',
    defaultProps: {
      backgroundColor: '#ffffff',
      padding: 20,
      borderRadius: 0,
      border: 'none'
    },
    defaultSize: { width: 400, height: 200 },
    minSize: { width: 100, height: 50 },
    maxSize: { width: 1200, height: 800 },
    resizable: true,
    draggable: true
  },

  row: {
    type: 'row',
    name: 'Строка',
    category: 'layout',
    icon: '📏',
    defaultProps: {
      direction: 'row',
      gap: 16,
      alignItems: 'flex-start',
      justifyContent: 'flex-start'
    },
    defaultSize: { width: 400, height: 100 },
    minSize: { width: 200, height: 50 },
    maxSize: { width: 1200, height: 300 },
    resizable: true,
    draggable: true
  },

  column: {
    type: 'column',
    name: 'Колонка',
    category: 'layout',
    icon: '📐',
    defaultProps: {
      direction: 'column',
      gap: 16,
      alignItems: 'flex-start',
      justifyContent: 'flex-start'
    },
    defaultSize: { width: 200, height: 300 },
    minSize: { width: 100, height: 100 },
    maxSize: { width: 600, height: 800 },
    resizable: true,
    draggable: true
  },

  // Контент
  text: {
    type: 'text',
    name: 'Текст',
    category: 'content',
    icon: '📝',
    defaultProps: {
      content: 'Введите текст...',
      fontSize: 16,
      fontWeight: 'normal',
      color: '#000000',
      textAlign: 'left'
    },
    defaultSize: { width: 200, height: 50 },
    minSize: { width: 50, height: 20 },
    maxSize: { width: 800, height: 200 },
    resizable: true,
    draggable: true
  },

  image: {
    type: 'image',
    name: 'Изображение',
    category: 'content',
    icon: '🖼️',
    defaultProps: {
      src: '/placeholder-image.jpg',
      alt: 'Изображение',
      objectFit: 'cover',
      borderRadius: 0
    },
    defaultSize: { width: 300, height: 200 },
    minSize: { width: 50, height: 50 },
    maxSize: { width: 800, height: 600 },
    resizable: true,
    draggable: true
  },

  button: {
    type: 'button',
    name: 'Кнопка',
    category: 'forms',
    icon: '🔘',
    defaultProps: {
      text: 'Кнопка',
      variant: 'primary',
      size: 'medium',
      disabled: false,
      onClick: null
    },
    defaultSize: { width: 120, height: 40 },
    minSize: { width: 80, height: 32 },
    maxSize: { width: 300, height: 60 },
    resizable: true,
    draggable: true
  },

  // Специальные блоки для конфигураторов
  productGrid: {
    type: 'productGrid',
    name: 'Сетка товаров',
    category: 'products',
    icon: '🛍️',
    defaultProps: {
      columns: 3,
      rows: 4,
      showPrices: true,
      showImages: true,
      showButtons: true,
      pagination: true,
      sorting: true,
      categoryId: null
    },
    defaultSize: { width: 600, height: 400 },
    minSize: { width: 300, height: 200 },
    maxSize: { width: 1200, height: 800 },
    resizable: true,
    draggable: true
  },

  productFilter: {
    type: 'productFilter',
    name: 'Фильтр товаров',
    category: 'products',
    icon: '🔍',
    defaultProps: {
      filterTypes: [
        { type: 'range', label: 'Цена', active: true },
        { type: 'select', label: 'Бренд', active: true },
        { type: 'checkbox', label: 'Материал', active: false },
        { type: 'color', label: 'Цвет', active: false }
      ],
      categoryId: null
    },
    defaultSize: { width: 300, height: 200 },
    minSize: { width: 200, height: 100 },
    maxSize: { width: 500, height: 400 },
    resizable: true,
    draggable: true
  },

  productCart: {
    type: 'productCart',
    name: 'Корзина',
    category: 'products',
    icon: '🛒',
    defaultProps: {
      showImages: true,
      showQuantity: true,
      showTotal: true,
      showButtons: true,
      position: 'fixed-right',
      maxItems: 10
    },
    defaultSize: { width: 350, height: 500 },
    minSize: { width: 250, height: 300 },
    maxSize: { width: 500, height: 700 },
    resizable: true,
    draggable: true
  },

  priceCalculator: {
    type: 'priceCalculator',
    name: 'Калькулятор цен',
    category: 'products',
    icon: '💰',
    defaultProps: {
      showFormula: true,
      showBreakdown: true,
      showTotal: true,
      currency: 'RUB',
      taxRate: 0.2
    },
    defaultSize: { width: 400, height: 300 },
    minSize: { width: 250, height: 200 },
    maxSize: { width: 600, height: 500 },
    resizable: true,
    draggable: true
  }
};

export const BLOCK_CATEGORIES = {
  layout: {
    title: 'Макет',
    icon: '🏗️',
    blocks: ['container', 'row', 'column']
  },
  content: {
    title: 'Контент',
    icon: '📄',
    blocks: ['text', 'image']
  },
  forms: {
    title: 'Формы',
    icon: '📝',
    blocks: ['button', 'form']
  },
  products: {
    title: 'Товары',
    icon: '🛍️',
    blocks: ['productGrid', 'productFilter', 'productCart', 'priceCalculator']
  }
};

