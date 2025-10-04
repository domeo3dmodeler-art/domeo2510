'use client';

import React from 'react';
import { ConstructorElement } from './types';

interface PropertiesPanelProps {
  selectedElement: ConstructorElement | null;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onUpdate: (updates: Partial<ConstructorElement>) => void;
}

export default function PropertiesPanel({
  selectedElement,
  viewport,
  onUpdate
}: PropertiesPanelProps) {
  if (!selectedElement) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 h-full">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Свойства
          </h3>
          <div className="text-center text-gray-500 py-8">
            Выберите элемент для редактирования
          </div>
        </div>
      </div>
    );
  }

  const currentSettings = selectedElement.responsive[viewport];

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Свойства
        </h3>
        
        {/* Общая информация */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Элемент</h4>
          <div className="space-y-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Тип
              </label>
              <input
                type="text"
                value={selectedElement.component}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ID
              </label>
              <input
                type="text"
                value={selectedElement.id}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Размер и позиция */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Размер и позиция</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Ширина
              </label>
              <input
                type="number"
                value={currentSettings.width}
                onChange={(e) => onUpdate({
                  size: { ...selectedElement.size, width: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Высота
              </label>
              <input
                type="number"
                value={currentSettings.height}
                onChange={(e) => onUpdate({
                  size: { ...selectedElement.size, height: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                X
              </label>
              <input
                type="number"
                value={Math.round(selectedElement.position.x)}
                onChange={(e) => onUpdate({
                  position: { ...selectedElement.position, x: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Y
              </label>
              <input
                type="number"
                value={Math.round(selectedElement.position.y)}
                onChange={(e) => onUpdate({
                  position: { ...selectedElement.position, y: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Стили */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Стили</h4>
          <div className="space-y-3">
            {/* Фоновый цвет */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Фон
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={selectedElement.props.backgroundColor || '#ffffff'}
                  onChange={(e) => onUpdate({
                    props: { ...selectedElement.props, backgroundColor: e.target.value }
                  })}
                  className="w-8 h-8 border border-gray-300 rounded"
                />
                <input
                  type="text"
                  value={selectedElement.props.backgroundColor || '#ffffff'}
                  onChange={(e) => onUpdate({
                    props: { ...selectedElement.props, backgroundColor: e.target.value }
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            {/* Отступы */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Отступы
              </label>
              <input
                type="number"
                value={selectedElement.props.padding || 0}
                onChange={(e) => onUpdate({
                  props: { ...selectedElement.props, padding: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>

            {/* Скругление */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Скругление
              </label>
              <input
                type="number"
                value={selectedElement.props.borderRadius || 0}
                onChange={(e) => onUpdate({
                  props: { ...selectedElement.props, borderRadius: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Специфичные настройки для разных типов элементов */}
        {renderSpecificProperties(selectedElement, onUpdate)}

        {/* Адаптивность */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Адаптивность</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Desktop</span>
              <input
                type="checkbox"
                checked={selectedElement.responsive.desktop.visible}
                onChange={(e) => onUpdate({
                  responsive: {
                    ...selectedElement.responsive,
                    desktop: {
                      ...selectedElement.responsive.desktop,
                      visible: e.target.checked
                    }
                  }
                })}
                className="rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tablet</span>
              <input
                type="checkbox"
                checked={selectedElement.responsive.tablet.visible}
                onChange={(e) => onUpdate({
                  responsive: {
                    ...selectedElement.responsive,
                    tablet: {
                      ...selectedElement.responsive.tablet,
                      visible: e.target.checked
                    }
                  }
                })}
                className="rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Mobile</span>
              <input
                type="checkbox"
                checked={selectedElement.responsive.mobile.visible}
                onChange={(e) => onUpdate({
                  responsive: {
                    ...selectedElement.responsive,
                    mobile: {
                      ...selectedElement.responsive.mobile,
                      visible: e.target.checked
                    }
                  }
                })}
                className="rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSpecificProperties(element: ConstructorElement, onUpdate: (updates: Partial<ConstructorElement>) => void) {
  switch (element.component) {
    case 'text':
      return (
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Текст</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Содержимое
              </label>
              <textarea
                value={element.props.content || ''}
                onChange={(e) => onUpdate({
                  props: { ...element.props, content: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Размер шрифта
              </label>
              <input
                type="number"
                value={element.props.fontSize || 16}
                onChange={(e) => onUpdate({
                  props: { ...element.props, fontSize: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Цвет текста
              </label>
              <input
                type="color"
                value={element.props.color || '#000000'}
                onChange={(e) => onUpdate({
                  props: { ...element.props, color: e.target.value }
                })}
                className="w-full h-10 border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Кнопка</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Текст
              </label>
              <input
                type="text"
                value={element.props.text || ''}
                onChange={(e) => onUpdate({
                  props: { ...element.props, text: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Вариант
              </label>
              <select
                value={element.props.variant || 'primary'}
                onChange={(e) => onUpdate({
                  props: { ...element.props, variant: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="primary">Основная</option>
                <option value="secondary">Вторичная</option>
                <option value="outline">Контурная</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'productGrid':
      return (
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-3">Сетка товаров</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Колонки
              </label>
              <input
                type="number"
                value={element.props.columns || 3}
                onChange={(e) => onUpdate({
                  props: { ...element.props, columns: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                min="1"
                max="6"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Строки
              </label>
              <input
                type="number"
                value={element.props.rows || 4}
                onChange={(e) => onUpdate({
                  props: { ...element.props, rows: parseInt(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                min="1"
                max="10"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Показывать цены</span>
                <input
                  type="checkbox"
                  checked={element.props.showPrices !== false}
                  onChange={(e) => onUpdate({
                    props: { ...element.props, showPrices: e.target.checked }
                  })}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Показывать изображения</span>
                <input
                  type="checkbox"
                  checked={element.props.showImages !== false}
                  onChange={(e) => onUpdate({
                    props: { ...element.props, showImages: e.target.checked }
                  })}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Показывать кнопки</span>
                <input
                  type="checkbox"
                  checked={element.props.showButtons !== false}
                  onChange={(e) => onUpdate({
                    props: { ...element.props, showButtons: e.target.checked }
                  })}
                  className="rounded"
                />
              </div>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

