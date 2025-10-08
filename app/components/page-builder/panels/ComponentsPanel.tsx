'use client';

import React, { useState } from 'react';
import { ComponentsPanelProps } from '../types';
import { getBlockName, getBlockDescription } from '../../../lib/block-names';

interface ComponentCategory {
  id: string;
  name: string;
  icon: string;
  components: ComponentItem[];
}

interface ComponentItem {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
}

// Очищенный список компонентов
const componentCategories: ComponentCategory[] = [
  {
    id: 'essential',
    name: 'Основные элементы',
    icon: '⭐',
    components: [
      { id: 'heading', name: 'Заголовок', type: 'heading', icon: '📰', description: 'Заголовок страницы или секции' },
      { id: 'text', name: 'Текст', type: 'text', icon: '📝', description: 'Текстовый блок' },
      { id: 'section', name: 'Секция', type: 'section', icon: '📋', description: 'Контейнер для группировки элементов' },
      { id: 'spacer', name: 'Отступ', type: 'spacer', icon: '↔️', description: 'Пустое пространство между элементами' }
    ]
  },
  {
    id: 'products',
    name: 'Товарные компоненты',
    icon: '📦',
    components: [
      { id: 'productCard', name: 'Карточка товара', type: 'productCard', icon: '🛍️', description: 'Карточка товара с изображением и ценой' },
      { id: 'productGrid', name: 'Сетка товаров', type: 'productGrid', icon: '📊', description: 'Сетка товаров с фильтрацией' },
      { id: 'filteredProducts', name: 'Фильтрованные товары', type: 'filteredProducts', icon: '🔍', description: 'Товары с возможностью фильтрации через связи' }
    ]
  },
  {
    id: 'filters',
    name: 'Фильтры',
    icon: '🔍',
    components: [
      { id: 'productFilter', name: 'Фильтр товаров', type: 'productFilter', icon: '🔍', description: 'Интерактивный фильтр для товаров' },
      { id: 'propertyFilter', name: 'Фильтр по свойству', type: 'propertyFilter', icon: '🏷️', description: 'Универсальный фильтр по любому свойству товара' }
    ]
  },
  {
    id: 'forms',
    name: 'Формы и поля',
    icon: '📝',
    components: [
      { id: 'input', name: 'Поле ввода', type: 'input', icon: '📝', description: 'Поле для ввода текста или чисел' },
      { id: 'select', name: 'Выпадающий список', type: 'select', icon: '📋', description: 'Выбор из списка опций' },
      { id: 'checkbox', name: 'Чекбокс', type: 'checkbox', icon: '☑️', description: 'Множественный выбор опций' },
      { id: 'radio', name: 'Радиокнопка', type: 'radio', icon: '🔘', description: 'Одиночный выбор из группы' }
    ]
  },
  {
    id: 'functional',
    name: 'Функциональные',
    icon: '⚙️',
    components: [
      { id: 'cart', name: 'Корзина', type: 'cart', icon: '🛒', description: 'Корзина покупок' }
    ]
  }
];

export function ComponentsPanel({ onAddElement, selectedCategory }: ComponentsPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['essential', 'products', 'filters']);
  const [searchQuery, setSearchQuery] = useState('');

  // Фильтрация компонентов по поиску
  const filteredCategories = componentCategories.map(category => ({
    ...category,
    components: category.components.filter(component =>
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.components.length > 0);

  // Переключение категории
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Добавление элемента
  const handleAddElement = (component: ComponentItem) => {
    const newElement: any = {
      id: `element-${Date.now()}`,
      type: component.type,
      position: { x: 50, y: 50 },
      size: { width: 300, height: 200 },
      props: {},
      style: {
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        margin: '0px'
      }
    };

    // Устанавливаем размеры по умолчанию для разных типов
    switch (component.type) {
      case 'heading':
        newElement.size = { width: 400, height: 80 };
        newElement.props = { text: 'Новый заголовок', level: 2 };
        break;
      case 'text':
        newElement.size = { width: 300, height: 120 };
        newElement.props = { text: 'Новый текст' };
        break;
      case 'productCard':
        newElement.size = { width: 250, height: 300 };
        break;
      case 'productGrid':
        newElement.size = { width: 600, height: 400 };
        break;
      case 'cart':
        newElement.size = { width: 350, height: 200 };
        break;
      case 'section':
        newElement.size = { width: 500, height: 300 };
        newElement.style.backgroundColor = '#f9fafb';
        break;
      case 'spacer':
        newElement.size = { width: 200, height: 50 };
        newElement.style.backgroundColor = '#f3f4f6';
        break;
    }

    onAddElement(newElement);
  };

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Компоненты</h2>
        <p className="text-sm text-gray-600 mt-1">Перетащите компонент на страницу</p>
      </div>

      {/* Поиск */}
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Поиск компонентов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Список компонентов */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map(category => (
          <div key={category.id} className="border-b border-gray-100">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div className="flex items-center">
                <span className="text-lg mr-2">{category.icon}</span>
                <span className="font-medium text-gray-900">{category.name}</span>
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {category.components.length}
                </span>
              </div>
              <span className={`text-gray-400 transition-transform ${
                expandedCategories.includes(category.id) ? 'rotate-180' : ''
              }`}>
                ▼
              </span>
            </button>

            {expandedCategories.includes(category.id) && (
              <div className="bg-gray-50">
                {category.components.map(component => (
                  <div
                    key={component.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify(component));
                    }}
                    onClick={() => handleAddElement(component)}
                    className="px-6 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center">
                      <span className="text-lg mr-3">{component.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{component.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{component.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Подсказка */}
      <div className="p-4 bg-blue-50 border-t border-blue-200">
        <div className="text-xs text-blue-700">
          <div className="font-medium mb-1">💡 Подсказка:</div>
          <div>Кликните на компонент или перетащите его на страницу</div>
        </div>
      </div>
    </div>
  );
}