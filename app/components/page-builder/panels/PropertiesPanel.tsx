'use client';

import React, { useState, useEffect } from 'react';
import { PropertiesPanelProps, BaseElement, Page, Spacing, Style } from '../types';
import { CategoryTreeSelector } from './CategoryTreeSelector';
import { ProductPropertiesSelector } from './ProductPropertiesSelector';
import { PropertyDisplaySettings } from './PropertyDisplaySettings';
import { extractUniquePropertyValues } from '@/lib/string-utils';

export function PropertiesPanel({ element, page, onUpdateElement, onUpdatePage }: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'layout' | 'page'>('content');
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // Загрузка категорий каталога
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetch('/api/catalog/categories/tree');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Загрузка свойств для выбранных категорий
  useEffect(() => {
    const loadProperties = async () => {
      if (!element?.props?.categoryIds?.length) {
        setAvailableProperties([]);
        return;
      }

      try {
        const response = await fetch('/api/catalog/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryIds: element.props.categoryIds })
        });
        
        if (response.ok) {
          const propertiesData = await response.json();
          const properties = propertiesData.properties || [];
          
          // Используем оптимизированный API для получения уникальных значений
          setLoadingProducts(true);
          setLoadingProgress({ current: 0, total: 100 });
          
          try {
            const propertyNames = properties.map((prop: any) => prop.name);
            const response = await fetch('/api/catalog/properties/unique-values', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                categoryIds: element.props.categoryIds,
                propertyNames: propertyNames
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              const uniqueValues = data.uniqueValues || {};
              
              // Преобразуем результат в формат, ожидаемый компонентом
              const propertiesWithOptions = properties.map((property: any) => {
                const values = uniqueValues[property.name] || [];
                const options = values.map((value: string) => ({
                  value: value,
                  label: value
                }));
                
                console.log(`Property "${property.name}": found ${options.length} unique values:`, values);
                
                return {
                  ...property,
                  options: options
                };
              });
              
              setAvailableProperties(propertiesWithOptions);
              setLoadingProgress({ current: 100, total: 100 });
            } else {
              console.error('Failed to load unique values');
              setAvailableProperties(properties);
            }
          } catch (error) {
            console.error('Error loading unique values:', error);
            setAvailableProperties(properties);
          } finally {
            setLoadingProducts(false);
          }
        }
      } catch (error) {
        console.error('Error loading properties:', error);
        setAvailableProperties([]);
      }
    };

    loadProperties();
  }, [element?.props?.categoryIds]);

  // Обработчики для элемента
  const handleElementPropChange = (key: string, value: any) => {
    if (!element) return;
    
    onUpdateElement(element.id, {
      props: {
        ...element.props,
        [key]: value
      }
    });
  };

  const handleElementStyleChange = (key: keyof Style, value: any) => {
    if (!element) return;
    
    onUpdateElement(element.id, {
      style: {
        ...element.style,
        [key]: value
      }
    });
  };

  const handleElementPositionChange = (key: 'x' | 'y', value: number) => {
    if (!element) return;
    
    onUpdateElement(element.id, {
      position: {
        ...element.position,
        [key]: value
      }
    });
  };

  const handleElementSizeChange = (key: 'width' | 'height', value: number) => {
    if (!element) return;
    
    onUpdateElement(element.id, {
      size: {
        ...element.size,
        [key]: value
      }
    });
  };

  const handleSpacingChange = (spacingType: 'padding' | 'margin', key: keyof Spacing, value: number) => {
    if (!element) return;
    
    onUpdateElement(element.id, {
      style: {
        ...element.style,
        [spacingType]: {
          ...element.style[spacingType],
          [key]: value
        }
      }
    });
  };

  // Обработчики для страницы
  const handlePageSettingChange = (key: string, value: any) => {
    if (!page) return;
    
    onUpdatePage({
      settings: {
        ...page.settings,
        [key]: value
      }
    });
  };

  // Рендеринг вкладки содержимого
  const renderContentTab = () => {
    if (!element) return null;

    switch (element.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Содержимое
              </label>
              <textarea
                value={element.props.content || ''}
                onChange={(e) => handleElementPropChange('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер шрифта
              </label>
              <input
                type="number"
                value={element.props.fontSize || 16}
                onChange={(e) => handleElementPropChange('fontSize', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цвет текста
              </label>
              <input
                type="color"
                value={element.props.color || '#1f2937'}
                onChange={(e) => handleElementPropChange('color', e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Содержимое
              </label>
              <input
                type="text"
                value={element.props.content || ''}
                onChange={(e) => handleElementPropChange('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Уровень заголовка
              </label>
              <select
                value={element.props.level || 1}
                onChange={(e) => handleElementPropChange('level', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
                <option value={5}>H5</option>
                <option value={6}>H6</option>
              </select>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL изображения
              </label>
              <input
                type="url"
                value={element.props.src || ''}
                onChange={(e) => handleElementPropChange('src', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt текст
              </label>
              <input
                type="text"
                value={element.props.alt || ''}
                onChange={(e) => handleElementPropChange('alt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Текст кнопки
              </label>
              <input
                type="text"
                value={element.props.text || ''}
                onChange={(e) => handleElementPropChange('text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Вариант
              </label>
              <select
                value={element.props.variant || 'primary'}
                onChange={(e) => handleElementPropChange('variant', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="primary">Основная</option>
                <option value="secondary">Вторичная</option>
                <option value="outline">Контурная</option>
              </select>
            </div>
          </div>
        );

            case 'productConfigurator':
              return (
                <div className="space-y-4">
                  {/* Заголовок и описание */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Заголовок
                    </label>
                    <input
                      type="text"
                      value={element.props.title || ''}
                      onChange={(e) => handleElementPropChange('title', e.target.value)}
                      placeholder="Конфигуратор товаров"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Описание
                    </label>
                    <textarea
                      value={element.props.description || ''}
                      onChange={(e) => handleElementPropChange('description', e.target.value)}
                      placeholder="Выберите товар и настройте его под свои потребности"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Выбор категорий товаров */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Выбор категорий товаров
                    </label>
                    {loadingCategories ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        <div className="text-sm text-gray-500">Загрузка категорий...</div>
                      </div>
                    ) : loadingProducts ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50">
                        <div className="text-sm text-blue-600 mb-2">Загрузка товаров...</div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((loadingProgress.current / loadingProgress.total) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-blue-500 mt-1">
                          Загружено: {loadingProgress.current} товаров
                        </div>
                      </div>
                    ) : (
                      <CategoryTreeSelector
                        categories={categories}
                        selectedIds={element.props.categoryIds || []}
                        onSelectionChange={(selectedIds) => {
                          handleElementPropChange('categoryIds', selectedIds);
                        }}
                      />
                    )}
                  </div>

                  {/* Свойства товаров для отображения */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Свойства товаров для отображения
                    </label>
                    <ProductPropertiesSelector
                      categoryIds={element.props.categoryIds || []}
                      selectedPropertyIds={element.props.selectedPropertyIds || []}
                      onPropertiesChange={(selectedPropertyIds) => {
                        handleElementPropChange('selectedPropertyIds', selectedPropertyIds);
                      }}
                    />
                  </div>

                  {/* Настройка отображения свойств */}
                  {(element.props.selectedPropertyIds?.length > 0) && (
                    <div>
                      <PropertyDisplaySettings
                        selectedPropertyIds={element.props.selectedPropertyIds || []}
                        propertyDisplaySettings={element.props.propertyDisplaySettings || {}}
                        availableProperties={availableProperties}
                        onSettingsChange={(settings) => {
                          handleElementPropChange('propertyDisplaySettings', settings);
                        }}
                      />
                    </div>
                  )}

                  {/* Дополнительные настройки */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Лимит товаров
                      </label>
                      <input
                        type="number"
                        value={element.props.limit || 6}
                        onChange={(e) =>
                          handleElementPropChange('limit', parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Колонок в сетке
                      </label>
                      <select
                        value={element.props.columns || 3}
                        onChange={(e) => handleElementPropChange('columns', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={2}>2 колонки</option>
                        <option value={3}>3 колонки</option>
                        <option value={4}>4 колонки</option>
                      </select>
                    </div>
                  </div>

                  {/* Настройки отображения */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Настройки отображения
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={element.props.showFilters !== false}
                          onChange={(e) => handleElementPropChange('showFilters', e.target.checked)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Показывать фильтры</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={element.props.showProductSelector !== false}
                          onChange={(e) => handleElementPropChange('showProductSelector', e.target.checked)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Показывать селектор товаров</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={element.props.showConfiguration !== false}
                          onChange={(e) => handleElementPropChange('showConfiguration', e.target.checked)}
                          className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Показывать конфигурацию</span>
                      </label>
                    </div>
                  </div>
                </div>
              );

            case 'productGrid':
              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Выбор категорий товаров
                    </label>
                    {loadingCategories ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        <div className="text-sm text-gray-500">Загрузка категорий...</div>
                      </div>
                    ) : (
                      <CategoryTreeSelector
                        categories={categories}
                        selectedIds={element.props.categoryIds || []}
                        onSelectionChange={(selectedIds) => {
                          handleElementPropChange('categoryIds', selectedIds);
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Свойства товаров для отображения
                    </label>
                    <ProductPropertiesSelector
                      categoryIds={element.props.categoryIds || []}
                      selectedPropertyIds={element.props.selectedPropertyIds || []}
                      onPropertiesChange={(selectedPropertyIds) => {
                        handleElementPropChange('selectedPropertyIds', selectedPropertyIds);
                      }}
                    />
                  </div>

                  {/* Настройка отображения свойств */}
                  {(element.props.selectedPropertyIds?.length > 0) && (
                    <div>
                      <PropertyDisplaySettings
                        selectedPropertyIds={element.props.selectedPropertyIds || []}
                        propertyDisplaySettings={element.props.propertyDisplaySettings || {}}
                        availableProperties={availableProperties}
                        onSettingsChange={(settings) => {
                          handleElementPropChange('propertyDisplaySettings', settings);
                        }}
                      />
                    </div>
                  )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Лимит товаров
                </label>
                <input
                  type="number"
                  value={element.props.limit || 12}
                  onChange={(e) => handleElementPropChange('limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Колонки
                </label>
                <input
                  type="number"
                  value={element.props.columns || 3}
                  onChange={(e) => handleElementPropChange('columns', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="6"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showPrice || false}
                  onChange={(e) => handleElementPropChange('showPrice', e.target.checked)}
                  className="mr-2"
                />
                Показывать цену
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showDescription || false}
                  onChange={(e) => handleElementPropChange('showDescription', e.target.checked)}
                  className="mr-2"
                />
                Показывать описание
              </label>
            </div>
          </div>
        );

            case 'priceCalculator':
              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Категории товаров
                    </label>
                    {loadingCategories ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                        <div className="text-sm text-gray-500">Загрузка категорий...</div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {categories.map((category) => (
                          <label key={category.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={element.props.categoryIds?.includes(category.id) || false}
                              onChange={(e) => {
                                const currentIds = element.props.categoryIds || [];
                                const newIds = e.target.checked
                                  ? [...currentIds, category.id]
                                  : currentIds.filter(id => id !== category.id);
                                handleElementPropChange('categoryIds', newIds);
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">{category.name}</span>
                          </label>
                        ))}
                        {categories.length === 0 && (
                          <div className="text-sm text-gray-500">Нет доступных категорий</div>
                        )}
                      </div>
                    )}
                  </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showBreakdown || false}
                  onChange={(e) => handleElementPropChange('showBreakdown', e.target.checked)}
                  className="mr-2"
                />
                Показывать детализацию цены
              </label>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showCurrency || false}
                  onChange={(e) => handleElementPropChange('showCurrency', e.target.checked)}
                  className="mr-2"
                />
                Показывать валюту
              </label>
            </div>
          </div>
        );

      case 'section':
      case 'row':
      case 'column':
      case 'grid':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фоновый цвет
              </label>
              <input
                type="color"
                value={element.style.backgroundColor || '#ffffff'}
                onChange={(e) => handleElementStyleChange('backgroundColor', e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Отступы
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Верх"
                  value={element.style.padding?.top || 0}
                  onChange={(e) => handleElementSpacingChange('padding', 'top', parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  type="number"
                  placeholder="Низ"
                  value={element.style.padding?.bottom || 0}
                  onChange={(e) => handleElementSpacingChange('padding', 'bottom', parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  type="number"
                  placeholder="Лево"
                  value={element.style.padding?.left || 0}
                  onChange={(e) => handleElementSpacingChange('padding', 'left', parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  type="number"
                  placeholder="Право"
                  value={element.style.padding?.right || 0}
                  onChange={(e) => handleElementSpacingChange('padding', 'right', parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        );

      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Заголовок Hero секции"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подзаголовок
              </label>
              <textarea
                value={element.props.subtitle || ''}
                onChange={(e) => handleElementPropChange('subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Подзаголовок Hero секции"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Текст кнопки
              </label>
              <input
                type="text"
                value={element.props.buttonText || ''}
                onChange={(e) => handleElementPropChange('buttonText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Текст кнопки"
              />
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок карточки
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Заголовок"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={element.props.description || ''}
                onChange={(e) => handleElementPropChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Описание карточки"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL изображения
              </label>
              <input
                type="url"
                value={element.props.imageUrl || ''}
                onChange={(e) => handleElementPropChange('imageUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
        );

      case 'header':
      case 'footer':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Логотип URL
              </label>
              <input
                type="url"
                value={element.props.logoUrl || ''}
                onChange={(e) => handleElementPropChange('logoUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пункты меню (через запятую)
              </label>
              <input
                type="text"
                value={element.props.menuItems?.join(', ') || ''}
                onChange={(e) => handleElementPropChange('menuItems', e.target.value.split(',').map(item => item.trim()))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Главная, О нас, Контакты"
              />
            </div>
          </div>
        );

      case 'icon':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Иконка (эмодзи)
              </label>
              <input
                type="text"
                value={element.props.icon || '⭐'}
                onChange={(e) => handleElementPropChange('icon', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="⭐"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер иконки
              </label>
              <select
                value={element.props.size || 'medium'}
                onChange={(e) => handleElementPropChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
                <option value="xl">Очень большой</option>
              </select>
            </div>
          </div>
        );

      case 'badge':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Текст значка
              </label>
              <input
                type="text"
                value={element.props.text || ''}
                onChange={(e) => handleElementPropChange('text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Новинка"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цвет значка
              </label>
              <select
                value={element.props.variant || 'red'}
                onChange={(e) => handleElementPropChange('variant', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="red">Красный</option>
                <option value="blue">Синий</option>
                <option value="green">Зеленый</option>
                <option value="yellow">Желтый</option>
                <option value="purple">Фиолетовый</option>
                <option value="gray">Серый</option>
              </select>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Свяжитесь с нами"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подзаголовок
              </label>
              <input
                type="text"
                value={element.props.subtitle || ''}
                onChange={(e) => handleElementPropChange('subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Мы всегда рады помочь"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                type="text"
                value={element.props.phone || ''}
                onChange={(e) => handleElementPropChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={element.props.email || ''}
                onChange={(e) => handleElementPropChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="info@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Адрес
              </label>
              <input
                type="text"
                value={element.props.address || ''}
                onChange={(e) => handleElementPropChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="г. Москва, ул. Примерная, 1"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showContactInfo !== false}
                  onChange={(e) => handleElementPropChange('showContactInfo', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать контактную информацию</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showForm !== false}
                  onChange={(e) => handleElementPropChange('showForm', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать форму обратной связи</span>
              </label>
            </div>
          </div>
        );

      case 'accordion':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Часто задаваемые вопросы"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подзаголовок
              </label>
              <input
                type="text"
                value={element.props.subtitle || ''}
                onChange={(e) => handleElementPropChange('subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Найдите ответы на популярные вопросы"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.allowMultiple || false}
                  onChange={(e) => handleElementPropChange('allowMultiple', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Разрешить открытие нескольких секций</span>
              </label>
            </div>
          </div>
        );

      case 'gallery':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Наша галерея"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Подзаголовок
              </label>
              <input
                type="text"
                value={element.props.subtitle || ''}
                onChange={(e) => handleElementPropChange('subtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Посмотрите наши работы"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Колонок в сетке
              </label>
              <select
                value={element.props.columns || 3}
                onChange={(e) => handleElementPropChange('columns', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 колонка</option>
                <option value={2}>2 колонки</option>
                <option value={3}>3 колонки</option>
                <option value={4}>4 колонки</option>
                <option value={5}>5 колонок</option>
                <option value={6}>6 колонок</option>
              </select>
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showCaptions || false}
                  onChange={(e) => handleElementPropChange('showCaptions', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать подписи к изображениям</span>
              </label>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-4">⚙️</div>
            <p>Настройки для этого элемента недоступны</p>
          </div>
        );
    }
  };

  // Рендеринг вкладки стилей
  const renderStyleTab = () => {
    if (!element) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Фоновый цвет
          </label>
          <input
            type="color"
            value={element.style.backgroundColor || '#ffffff'}
            onChange={(e) => handleElementStyleChange('backgroundColor', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Цвет границы
          </label>
          <input
            type="color"
            value={element.style.borderColor || '#000000'}
            onChange={(e) => handleElementStyleChange('borderColor', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Толщина границы
          </label>
          <input
            type="number"
            value={element.style.borderWidth || 0}
            onChange={(e) => handleElementStyleChange('borderWidth', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Скругление углов
          </label>
          <input
            type="number"
            value={element.style.borderRadius || 0}
            onChange={(e) => handleElementStyleChange('borderRadius', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Прозрачность
          </label>
          <input
            type="range"
            value={element.style.opacity || 1}
            onChange={(e) => handleElementStyleChange('opacity', parseFloat(e.target.value))}
            className="w-full"
            min="0"
            max="1"
            step="0.1"
          />
          <div className="text-xs text-gray-500 text-center">
            {Math.round((element.style.opacity || 1) * 100)}%
          </div>
        </div>
      </div>
    );
  };

  // Рендеринг вкладки макета
  const renderLayoutTab = () => {
    if (!element) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              X
            </label>
            <input
              type="number"
              value={element.position.x}
              onChange={(e) => handleElementPositionChange('x', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Y
            </label>
            <input
              type="number"
              value={element.position.y}
              onChange={(e) => handleElementPositionChange('y', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ширина
            </label>
            <input
              type="number"
              value={element.size.width}
              onChange={(e) => handleElementSizeChange('width', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={element.constraints.minWidth}
              max={element.constraints.maxWidth}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Высота
            </label>
            <input
              type="number"
              value={element.size.height}
              onChange={(e) => handleElementSizeChange('height', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={element.constraints.minHeight}
              max={element.constraints.maxHeight}
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Отступы</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Верх</label>
              <input
                type="number"
                value={element.style.padding?.top || 0}
                onChange={(e) => handleSpacingChange('padding', 'top', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Право</label>
              <input
                type="number"
                value={element.style.padding?.right || 0}
                onChange={(e) => handleSpacingChange('padding', 'right', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Низ</label>
              <input
                type="number"
                value={element.style.padding?.bottom || 0}
                onChange={(e) => handleSpacingChange('padding', 'bottom', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Лево</label>
              <input
                type="number"
                value={element.style.padding?.left || 0}
                onChange={(e) => handleSpacingChange('padding', 'left', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Рендеринг вкладки страницы
  const renderPageTab = () => {
    if (!page) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название страницы
          </label>
          <input
            type="text"
            value={page.name}
            onChange={(e) => onUpdatePage({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Фоновый цвет страницы
          </label>
          <input
            type="color"
            value={page.settings.backgroundColor}
            onChange={(e) => handlePageSettingChange('backgroundColor', e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ширина
            </label>
            <input
              type="number"
              value={page.settings.width}
              onChange={(e) => handlePageSettingChange('width', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Высота
            </label>
            <input
              type="number"
              value={page.settings.height}
              onChange={(e) => handlePageSettingChange('height', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {element ? 'Свойства элемента' : 'Свойства страницы'}
        </h3>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {element && (
            <>
              <button
                onClick={() => setActiveTab('content')}
                className={`px-2 py-2 text-xs font-medium ${
                  activeTab === 'content'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Контент
              </button>
              <button
                onClick={() => setActiveTab('style')}
                className={`px-2 py-2 text-xs font-medium ${
                  activeTab === 'style'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Стили
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`px-2 py-2 text-xs font-medium ${
                  activeTab === 'layout'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Макет
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('page')}
            className={`px-2 py-2 text-xs font-medium ${
              activeTab === 'page'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Страница
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' && renderContentTab()}
        {activeTab === 'style' && renderStyleTab()}
        {activeTab === 'layout' && renderLayoutTab()}
        {activeTab === 'page' && renderPageTab()}
      </div>
    </div>
  );
}
