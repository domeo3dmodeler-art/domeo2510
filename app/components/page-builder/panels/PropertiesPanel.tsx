'use client';

import React, { useState, useEffect } from 'react';
import { PropertiesPanelProps, BaseElement, Page, Spacing, Style } from '../types';
import { CategoryTreeSelector } from './CategoryTreeSelector';
import { ProductPropertiesSelector } from './ProductPropertiesSelector';
import { PropertyDisplaySettings } from './PropertyDisplaySettings';
import { CatalogSelector } from '../elements/CatalogSelector';
import { extractUniquePropertyValues } from '@/lib/string-utils';

export function PropertiesPanel({ element, page, onUpdateElement, onUpdatePage }: PropertiesPanelProps) {
  console.log('🚨 PropertiesPanel: Рендер!', {
    elementType: element?.type,
    elementId: element?.id,
    elementProps: element?.props
  });
  
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
      console.log('PropertiesPanel: Загрузка свойств для категорий:', element?.props?.categoryIds);
      
      if (!element?.props?.categoryIds?.length) {
        console.log('PropertiesPanel: Нет категорий, очищаем свойства');
        setAvailableProperties([]);
        return;
      }

      try {
        console.log('PropertiesPanel: Запрос к API /api/catalog/properties');
        const response = await fetch('/api/catalog/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryIds: element.props.categoryIds })
        });
        
        if (response.ok) {
          const propertiesData = await response.json();
          const properties = propertiesData.properties || [];
          console.log('PropertiesPanel: Загружены свойства:', properties.map(p => ({ id: p.id, name: p.name })));
          
          // Используем оптимизированный API для получения уникальных значений
          setLoadingProducts(true);
          setLoadingProgress({ current: 0, total: 100 });
          
          try {
            // ИСПРАВЛЕНИЕ: Не загружаем данные для всех свойств сразу
            // PropertyFilter будет загружать данные для конкретного выбранного свойства
            console.log('PropertiesPanel: Пропускаем загрузку данных для всех свойств - PropertyFilter загрузит данные для выбранного свойства');
            
            // Преобразуем результат в формат, ожидаемый компонентом (без данных)
            const propertiesWithOptions = properties.map((property: any) => {
              console.log(`Property "${property.name}": без загруженных значений (PropertyFilter загрузит)`);
              
              return {
                ...property,
                options: [] // Пустые опции, PropertyFilter загрузит данные
              };
            });
            
            setAvailableProperties(propertiesWithOptions);
            console.log('PropertiesPanel: Установлены доступные свойства:', propertiesWithOptions.map(p => ({ id: p.id, name: p.name })));
            setLoadingProgress({ current: 100, total: 100 });
          } catch (error: any) {
            console.error('PropertiesPanel: Ошибка загрузки уникальных значений:', error);
            setAvailableProperties(properties);
            console.log('PropertiesPanel: Установлены свойства без уникальных значений:', properties.map(p => ({ id: p.id, name: p.name })));
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

    console.log('🚨 PropertiesPanel: handleElementPropChange вызван!', {
      elementId: element.id,
      key,
      value,
      currentProps: element.props
    });

    const newProps = {
      ...element.props,
      [key]: value
    };

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если обновляем selectedPropertyIds, также устанавливаем propertyName
    if (key === 'selectedPropertyIds' && value?.length > 0 && availableProperties.length > 0) {
      const selectedProperty = availableProperties.find(p => p.id === value[0]);
      if (selectedProperty) {
        newProps.propertyName = selectedProperty.name;
        console.log('🚨 PropertiesPanel: Устанавливаем propertyName:', selectedProperty.name);
      }
    }

    console.log('🚨 PropertiesPanel: Создаем обновление!', {
      elementId: element.id,
      key,
      value,
      newProps,
      newPropsPropertyName: newProps.propertyName
    });

    onUpdateElement(element.id, {
      props: newProps
    });

    console.log('🚨 PropertiesPanel: onUpdateElement вызван!', {
      elementId: element.id,
      updates: { props: newProps }
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
                        console.log('🚨 PropertiesPanel: onPropertiesChange ВЫЗВАН!', {
                          selectedPropertyIds,
                          availableProperties: availableProperties.length,
                          availablePropertiesList: availableProperties.map(p => ({ id: p.id, name: p.name })),
                          elementProps: element.props
                        });

                        handleElementPropChange('selectedPropertyIds', selectedPropertyIds);

                        if (selectedPropertyIds.length > 0) {
                          const firstPropertyId = selectedPropertyIds[0];
                          console.log('PropertiesPanel: Поиск свойства по ID:', firstPropertyId);
                          
                          const property = availableProperties.find(p => p.id === firstPropertyId);
                          console.log('PropertiesPanel: Найдено свойство:', property);
                          console.log('PropertiesPanel: Все доступные свойства:', availableProperties);
                          
                          if (property) {
                            console.log('PropertiesPanel: Обновляем propertyName на:', property.name);
                            handleElementPropChange('propertyName', property.name);
                            
                            // Проверим, что изменения применились
                            setTimeout(() => {
                              console.log('PropertiesPanel: Проверка после обновления:', {
                                elementProps: element.props,
                                propertyName: element.props.propertyName,
                                selectedPropertyIds: element.props.selectedPropertyIds
                              });
                            }, 100);
                          } else {
                            console.error('PropertiesPanel: Свойство не найдено! Доступные свойства:', availableProperties.map(p => p.id));
                            console.error('PropertiesPanel: Попытка найти свойство по имени...');
                            
                            // Попробуем найти свойство по имени (fallback)
                            const propertyName = selectedPropertyIds[0]; // Предполагаем, что это имя свойства
                            if (typeof propertyName === 'string') {
                              console.log('PropertiesPanel: Используем имя свойства напрямую:', propertyName);
                              handleElementPropChange('propertyName', propertyName);
                            }
                          }
                        } else {
                          console.log('PropertiesPanel: Очищаем propertyName');
                          handleElementPropChange('propertyName', '');
                        }
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
                        console.log('🚨 PropertiesPanel: onPropertiesChange ВЫЗВАН!', {
                          selectedPropertyIds,
                          availableProperties: availableProperties.length,
                          availablePropertiesList: availableProperties.map(p => ({ id: p.id, name: p.name })),
                          elementProps: element.props
                        });

                        handleElementPropChange('selectedPropertyIds', selectedPropertyIds);

                        if (selectedPropertyIds.length > 0) {
                          const firstPropertyId = selectedPropertyIds[0];
                          console.log('PropertiesPanel: Поиск свойства по ID:', firstPropertyId);
                          
                          const property = availableProperties.find(p => p.id === firstPropertyId);
                          console.log('PropertiesPanel: Найдено свойство:', property);
                          console.log('PropertiesPanel: Все доступные свойства:', availableProperties);
                          
                          if (property) {
                            console.log('PropertiesPanel: Обновляем propertyName на:', property.name);
                            handleElementPropChange('propertyName', property.name);
                            
                            // Проверим, что изменения применились
                            setTimeout(() => {
                              console.log('PropertiesPanel: Проверка после обновления:', {
                                elementProps: element.props,
                                propertyName: element.props.propertyName,
                                selectedPropertyIds: element.props.selectedPropertyIds
                              });
                            }, 100);
                          } else {
                            console.error('PropertiesPanel: Свойство не найдено! Доступные свойства:', availableProperties.map(p => p.id));
                            console.error('PropertiesPanel: Попытка найти свойство по имени...');
                            
                            // Попробуем найти свойство по имени (fallback)
                            const propertyName = selectedPropertyIds[0]; // Предполагаем, что это имя свойства
                            if (typeof propertyName === 'string') {
                              console.log('PropertiesPanel: Используем имя свойства напрямую:', propertyName);
                              handleElementPropChange('propertyName', propertyName);
                            }
                          }
                        } else {
                          console.log('PropertiesPanel: Очищаем propertyName');
                          handleElementPropChange('propertyName', '');
                        }
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

      // Новые компоненты форм
      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название поля
              </label>
              <input
                type="text"
                value={element.props.label || ''}
                onChange={(e) => handleElementPropChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Название поля"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={element.props.placeholder || ''}
                onChange={(e) => handleElementPropChange('placeholder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Введите значение"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип поля
              </label>
              <select
                value={element.props.type || 'text'}
                onChange={(e) => handleElementPropChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Текст</option>
                <option value="number">Число</option>
                <option value="email">Email</option>
                <option value="tel">Телефон</option>
                <option value="password">Пароль</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер
              </label>
              <select
                value={element.props.size || 'medium'}
                onChange={(e) => handleElementPropChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.required || false}
                  onChange={(e) => handleElementPropChange('required', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Обязательное поле</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.disabled || false}
                  onChange={(e) => handleElementPropChange('disabled', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Отключено</span>
              </label>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название поля
              </label>
              <input
                type="text"
                value={element.props.label || ''}
                onChange={(e) => handleElementPropChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Название поля"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={element.props.placeholder || ''}
                onChange={(e) => handleElementPropChange('placeholder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Выберите опцию"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер
              </label>
              <select
                value={element.props.size || 'medium'}
                onChange={(e) => handleElementPropChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.required || false}
                  onChange={(e) => handleElementPropChange('required', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Обязательное поле</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.disabled || false}
                  onChange={(e) => handleElementPropChange('disabled', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Отключено</span>
              </label>
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Текст чекбокса
              </label>
              <input
                type="text"
                value={element.props.label || ''}
                onChange={(e) => handleElementPropChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Текст чекбокса"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер
              </label>
              <select
                value={element.props.size || 'medium'}
                onChange={(e) => handleElementPropChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.checked || false}
                  onChange={(e) => handleElementPropChange('checked', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">По умолчанию отмечен</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.disabled || false}
                  onChange={(e) => handleElementPropChange('disabled', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Отключено</span>
              </label>
            </div>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название группы
              </label>
              <input
                type="text"
                value={element.props.label || ''}
                onChange={(e) => handleElementPropChange('label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Название группы"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя группы
              </label>
              <input
                type="text"
                value={element.props.name || ''}
                onChange={(e) => handleElementPropChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="radio-group"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер
              </label>
              <select
                value={element.props.size || 'medium'}
                onChange={(e) => handleElementPropChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.disabled || false}
                  onChange={(e) => handleElementPropChange('disabled', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Отключено</span>
              </label>
            </div>
          </div>
        );

      case 'productFilter':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок фильтра
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Фильтры"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Категории товаров
              </label>
              <div className="text-sm text-gray-500 mb-2">
                Выберите категории для фильтрации товаров
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {/* Здесь можно добавить чекбоксы для выбора категорий */}
                <div className="text-xs text-gray-400">
                  Категории будут загружены автоматически
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип фильтра
              </label>
              <select
                value={element.props.filterType || 'advanced'}
                onChange={(e) => handleElementPropChange('filterType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="simple">Простой</option>
                <option value="advanced">Продвинутый</option>
                <option value="custom">Пользовательский</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showPriceRange || true}
                  onChange={(e) => handleElementPropChange('showPriceRange', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать диапазон цен</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showBrandFilter || true}
                  onChange={(e) => handleElementPropChange('showBrandFilter', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать фильтр по бренду</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showColorFilter || true}
                  onChange={(e) => handleElementPropChange('showColorFilter', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать фильтр по цвету</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showMaterialFilter || true}
                  onChange={(e) => handleElementPropChange('showMaterialFilter', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать фильтр по материалу</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Высота фильтра (px)
              </label>
              <input
                type="number"
                value={element.props.height || 400}
                onChange={(e) => handleElementPropChange('height', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="200"
                max="800"
              />
            </div>
          </div>
        );

      case 'propertyFilter':
        console.log('🚨 PropertiesPanel: Рендерим propertyFilter!', {
          elementType: element.type,
          elementId: element.id,
          elementProps: element.props,
          categoryIds: element.props.categoryIds,
          selectedPropertyIds: element.props.selectedPropertyIds
        });
        
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок фильтра
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Фильтр"
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

            {/* Выбор свойства для фильтрации */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Свойство для фильтрации
              </label>
              <ProductPropertiesSelector
                categoryIds={element.props.categoryIds || []}
                selectedPropertyIds={element.props.selectedPropertyIds || []}
                onPropertiesChange={(selectedPropertyIds) => {
                  console.log('🚨 PropertiesPanel: onPropertiesChange ВЫЗВАН!', {
                    selectedPropertyIds,
                    availableProperties: availableProperties.length,
                    availablePropertiesList: availableProperties.map(p => ({ id: p.id, name: p.name })),
                    categoryIds: element.props.categoryIds,
                    elementType: element.type
                  });
                  
                  // Берем первое выбранное свойство как основное для фильтрации
                  const firstPropertyId = selectedPropertyIds[0];
                  if (firstPropertyId) {
                    // Найдем название свойства по ID
                    const property = availableProperties.find(p => p.id === firstPropertyId);
                    console.log('PropertiesPanel: Поиск свойства по ID:', firstPropertyId);
                    console.log('PropertiesPanel: Найдено свойство:', property);
                    console.log('PropertiesPanel: Все доступные свойства:', availableProperties);
                    
                    if (property) {
                      console.log('PropertiesPanel: Обновляем propertyName на:', property.name);
                      handleElementPropChange('propertyName', property.name);
                      handleElementPropChange('selectedPropertyIds', selectedPropertyIds);
                      
                      // Проверим, что изменения применились
                      setTimeout(() => {
                        console.log('PropertiesPanel: Проверка после обновления:', {
                          elementProps: element.props,
                          propertyName: element.props.propertyName,
                          selectedPropertyIds: element.props.selectedPropertyIds
                        });
                      }, 100);
                    } else {
                      console.error('PropertiesPanel: Свойство не найдено! Доступные свойства:', availableProperties.map(p => p.id));
                      console.error('PropertiesPanel: Попытка найти свойство по имени...');
                      
                      // Попробуем найти свойство по имени (fallback)
                      const propertyName = selectedPropertyIds[0]; // Предполагаем, что это имя свойства
                      if (typeof propertyName === 'string') {
                        console.log('PropertiesPanel: Используем имя свойства напрямую:', propertyName);
                        handleElementPropChange('propertyName', propertyName);
                        handleElementPropChange('selectedPropertyIds', selectedPropertyIds);
                      }
                    }
                  } else {
                    console.log('PropertiesPanel: Очищаем propertyName');
                    handleElementPropChange('propertyName', '');
                    handleElementPropChange('selectedPropertyIds', []);
                  }
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Стиль отображения
              </label>
              <select
                value={element.props.displayStyle || 'cards'}
                onChange={(e) => handleElementPropChange('displayStyle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cards">Карточки</option>
                <option value="buttons">Кнопки</option>
                <option value="list">Список</option>
              </select>
            </div>

            {/* Настройки для карточек */}
            {element.props.displayStyle === 'cards' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Размер карточек
                  </label>
                  <select
                    value={element.props.cardSize || 'medium'}
                    onChange={(e) => handleElementPropChange('cardSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="small">Маленькие (100x80px)</option>
                    <option value="medium">Средние (150x120px)</option>
                    <option value="large">Большие (200x160px)</option>
                    <option value="xlarge">Очень большие (250x200px)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Изображение для карточек
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handleElementPropChange('cardImage', event.target?.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {element.props.cardImage && (
                      <div className="mt-2">
                        <img 
                          src={element.props.cardImage} 
                          alt="Предпросмотр" 
                          className="w-20 h-16 object-cover rounded border"
                        />
                        <button
                          onClick={() => handleElementPropChange('cardImage', '')}
                          className="ml-2 text-red-600 text-sm hover:text-red-800"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Или используйте URL изображения:
                    </div>
                    <input
                      type="url"
                      value={element.props.cardImageUrl || ''}
                      onChange={(e) => handleElementPropChange('cardImageUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Количество колонок
                  </label>
                  <select
                    value={element.props.columns || 'auto'}
                    onChange={(e) => handleElementPropChange('columns', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Автоматически</option>
                    <option value="1">1 колонка</option>
                    <option value="2">2 колонки</option>
                    <option value="3">3 колонки</option>
                    <option value="4">4 колонки</option>
                    <option value="5">5 колонок</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Высота фильтра (px)
              </label>
              <input
                type="number"
                value={element.props.height || 300}
                onChange={(e) => handleElementPropChange('height', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="200"
                max="800"
              />
            </div>
          </div>
        );

      case 'filteredProducts':
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
                placeholder="Товары"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Лимит товаров
              </label>
              <input
                type="number"
                value={element.props.limit || 12}
                onChange={(e) => handleElementPropChange('limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макет отображения
              </label>
              <select
                value={element.props.layout || 'grid'}
                onChange={(e) => handleElementPropChange('layout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="grid">Сетка</option>
                <option value="list">Список</option>
                <option value="compact">Компактный</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showAddToCart !== false}
                  onChange={(e) => handleElementPropChange('showAddToCart', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать кнопку "В корзину"</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Высота (px)
              </label>
              <input
                type="number"
                value={element.props.height || 500}
                onChange={(e) => handleElementPropChange('height', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="300"
                max="800"
              />
            </div>
          </div>
        );

      // Товарные компоненты
      case 'productCard':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название товара
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Название товара"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена
              </label>
              <input
                type="text"
                value={element.props.price || ''}
                onChange={(e) => handleElementPropChange('price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 ₽"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Оригинальная цена
              </label>
              <input
                type="text"
                value={element.props.originalPrice || ''}
                onChange={(e) => handleElementPropChange('originalPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 ₽"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Изображение
              </label>
              <input
                type="text"
                value={element.props.image || ''}
                onChange={(e) => handleElementPropChange('image', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/placeholder-product.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Значок скидки
              </label>
              <input
                type="text"
                value={element.props.badge || ''}
                onChange={(e) => handleElementPropChange('badge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-20%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макет
              </label>
              <select
                value={element.props.layout || 'vertical'}
                onChange={(e) => handleElementPropChange('layout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="vertical">Вертикальный</option>
                <option value="horizontal">Горизонтальный</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер
              </label>
              <select
                value={element.props.size || 'medium'}
                onChange={(e) => handleElementPropChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showBadge || false}
                  onChange={(e) => handleElementPropChange('showBadge', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать значок скидки</span>
              </label>
            </div>
          </div>
        );

      case 'productGallery':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макет галереи
              </label>
              <select
                value={element.props.layout || 'grid'}
                onChange={(e) => handleElementPropChange('layout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="grid">Сетка</option>
                <option value="carousel">Карусель</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showThumbnails !== false}
                  onChange={(e) => handleElementPropChange('showThumbnails', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать миниатюры</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showNavigation !== false}
                  onChange={(e) => handleElementPropChange('showNavigation', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать навигацию</span>
              </label>
            </div>
          </div>
        );

      case 'productGrid':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок секции
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Популярные товары"
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
                placeholder="Описание секции"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество товаров
              </label>
              <select
                value={element.props.limit || 12}
                onChange={(e) => handleElementPropChange('limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={4}>4 товара</option>
                <option value={8}>8 товаров</option>
                <option value={12}>12 товаров</option>
                <option value={16}>16 товаров</option>
                <option value={20}>20 товаров</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Колонки в сетке
              </label>
              <select
                value={element.props.columns || 4}
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
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showProperties !== false}
                  onChange={(e) => handleElementPropChange('showProperties', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать свойства товаров</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showDescription !== false}
                  onChange={(e) => handleElementPropChange('showDescription', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать описание</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showBadges !== false}
                  onChange={(e) => handleElementPropChange('showBadges', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать артикулы</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showSku !== false}
                  onChange={(e) => handleElementPropChange('showSku', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать SKU</span>
              </label>
            </div>
          </div>
        );

      case 'productDetails':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название товара
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Название товара"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена
              </label>
              <input
                type="text"
                value={element.props.price || ''}
                onChange={(e) => handleElementPropChange('price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 ₽"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Оригинальная цена
              </label>
              <input
                type="text"
                value={element.props.originalPrice || ''}
                onChange={(e) => handleElementPropChange('originalPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 ₽"
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
                rows={3}
                placeholder="Описание товара"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макет
              </label>
              <select
                value={element.props.layout || 'vertical'}
                onChange={(e) => handleElementPropChange('layout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="vertical">Вертикальный</option>
                <option value="horizontal">Горизонтальный</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showPrice !== false}
                  onChange={(e) => handleElementPropChange('showPrice', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать цену</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showDescription !== false}
                  onChange={(e) => handleElementPropChange('showDescription', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать описание</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showSpecifications !== false}
                  onChange={(e) => handleElementPropChange('showSpecifications', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать характеристики</span>
              </label>
            </div>
          </div>
        );

      // Компоненты отображения результатов
      case 'priceDisplay':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Цена
              </label>
              <input
                type="text"
                value={element.props.price || ''}
                onChange={(e) => handleElementPropChange('price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 ₽"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Оригинальная цена
              </label>
              <input
                type="text"
                value={element.props.originalPrice || ''}
                onChange={(e) => handleElementPropChange('originalPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 ₽"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Скидка
              </label>
              <input
                type="text"
                value={element.props.discount || ''}
                onChange={(e) => handleElementPropChange('discount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-20%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Размер
              </label>
              <select
                value={element.props.size || 'large'}
                onChange={(e) => handleElementPropChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
                <option value="xlarge">Очень большой</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Выравнивание
              </label>
              <select
                value={element.props.layout || 'center'}
                onChange={(e) => handleElementPropChange('layout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="left">По левому краю</option>
                <option value="center">По центру</option>
                <option value="right">По правому краю</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Фон
              </label>
              <select
                value={element.props.backgroundColor || 'transparent'}
                onChange={(e) => handleElementPropChange('backgroundColor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="transparent">Прозрачный</option>
                <option value="white">Белый</option>
                <option value="gray">Серый</option>
                <option value="blue">Голубой</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showDiscount || false}
                  onChange={(e) => handleElementPropChange('showDiscount', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать скидку</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showCurrency !== false}
                  onChange={(e) => handleElementPropChange('showCurrency', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать валюту</span>
              </label>
            </div>
          </div>
        );

      case 'summaryTable':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заголовок таблицы
              </label>
              <input
                type="text"
                value={element.props.title || ''}
                onChange={(e) => handleElementPropChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Сводка заказа"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Стиль таблицы
              </label>
              <select
                value={element.props.style || 'default'}
                onChange={(e) => handleElementPropChange('style', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Обычный</option>
                <option value="minimal">Минималистичный</option>
                <option value="highlighted">Выделенный</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showHeader !== false}
                  onChange={(e) => handleElementPropChange('showHeader', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать заголовок</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={element.props.showFooter !== false}
                  onChange={(e) => handleElementPropChange('showFooter', e.target.checked)}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Показывать подвал</span>
              </label>
            </div>
          </div>
        );

      case 'featureStatus':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Статус функций
              </label>
              <div className="text-xs text-gray-500 mb-2">
                Добавьте функции для отображения их статуса
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Функции (JSON):
              </label>
              <textarea
                value={JSON.stringify(element.props.features || [
                  {
                    name: "Дерево каталога",
                    status: "working",
                    description: "Иерархическое отображение категорий товаров"
                  },
                  {
                    name: "Система связей",
                    status: "working", 
                    description: "Визуальные связи между компонентами"
                  },
                  {
                    name: "Настройки карточек",
                    status: "working",
                    description: "Управление размером и изображениями карточек"
                  }
                ], null, 2)}
                onChange={(e) => {
                  try {
                    const features = JSON.parse(e.target.value);
                    handleElementPropChange('features', features);
                  } catch (error) {
                    console.error('Invalid JSON:', error);
                  }
                }}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                placeholder="Введите JSON с функциями..."
              />
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
