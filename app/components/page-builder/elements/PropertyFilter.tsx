'use client';

import React, { useState, useEffect } from 'react';
import { BaseElement } from '../types';

interface PropertyFilterProps {
  element: BaseElement;
  onUpdate: (updates: Partial<BaseElement>) => void;
  onFilterChange?: (propertyName: string, value: any) => void;
  onConnectionData?: (sourceElementId: string, data: any) => void;
}

interface PropertyOption {
  value: string;
  label: string;
  count?: number;
  image?: string;
  productImage?: string; // Фото товара из каталога
}

export function PropertyFilter({ element, onUpdate, onFilterChange, onConnectionData }: PropertyFilterProps) {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [options, setOptions] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- ДОБАВЛЕННЫЙ ЛОГ: При рендере компонента ---
  console.log(`PropertyFilter [${element.id}]: Рендер. element.props.propertyName:`, element.props.propertyName);
  console.log(`PropertyFilter [${element.id}]: Все props:`, element.props);

  // Загружаем уникальные значения свойства
  useEffect(() => {
    // --- ДОБАВЛЕННЫЙ ЛОГ: В начале useEffect ---
    console.log(`PropertyFilter [${element.id}]: useEffect triggered. element.props.propertyName:`, element.props.propertyName);
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Не загружаем данные, если свойство не выбрано
    if (!element.props.selectedPropertyIds?.length) {
      console.log(`PropertyFilter [${element.id}]: Свойство не выбрано пользователем, очищаем состояние`);
      setLoading(false);
      setError(null);
      setOptions([]);
      setSelectedValue('');
      return;
    }
    
    // Принудительно сбрасываем состояние при изменении propertyName
    if (element.props.propertyName) {
      console.log(`PropertyFilter [${element.id}]: propertyName изменился, сбрасываем состояние`);
      setLoading(true);
      setError(null);
      setOptions([]);
      setSelectedValue('');
    }
    
    const loadPropertyValues = async () => {
      console.log('PropertyFilter: Загрузка значений свойства', {
        propertyName: element.props.propertyName,
        categoryIds: element.props.categoryIds,
        selectedPropertyIds: element.props.selectedPropertyIds,
        allProps: element.props
      });

      // Если у нас уже есть propertyName, не нужно загружать через API
      if (element.props.propertyName) {
        console.log('PropertyFilter: propertyName уже установлен:', element.props.propertyName);
      } else {
        console.log('PropertyFilter: propertyName отсутствует, попробуем загрузить через API');
      }

      // Если нет propertyName, но есть selectedPropertyIds, попробуем получить имя свойства
      let propertyName = element.props.propertyName;
      if (!propertyName && element.props.selectedPropertyIds?.length > 0) {
        // Попробуем загрузить свойства и найти нужное
        try {
          const response = await fetch('/api/catalog/properties');
          if (response.ok) {
            const data = await response.json();
            console.log('PropertyFilter: Ответ API /api/catalog/properties:', data);
            
            // Проверяем структуру ответа
            let properties = [];
            if (Array.isArray(data)) {
              properties = data;
            } else if (data.properties && Array.isArray(data.properties)) {
              properties = data.properties;
            } else if (data.data && Array.isArray(data.data)) {
              properties = data.data;
            }
            
            console.log('PropertyFilter: Извлеченные свойства:', properties);
            
            const property = properties.find((p: any) => p.id === element.props.selectedPropertyIds[0]);
            if (property) {
              propertyName = property.name;
              console.log('PropertyFilter: Найдено имя свойства через API:', propertyName);
              
              // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем propertyName в element.props
              console.log('PropertyFilter: Сохраняем propertyName в element.props:', propertyName);
              onUpdate({
                props: {
                  ...element.props,
                  propertyName: propertyName
                }
              });
            } else {
              console.log('PropertyFilter: Свойство не найдено по ID:', element.props.selectedPropertyIds[0]);
            }
          }
        } catch (error) {
          console.error('PropertyFilter: Ошибка загрузки свойств:', error);
        }
      }

      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем, что пользователь выбрал свойство
      if (!propertyName || !element.props.categoryIds?.length || !element.props.selectedPropertyIds?.length) {
        console.log('PropertyFilter: Недостаточно данных для загрузки', {
          propertyName,
          categoryIds: element.props.categoryIds,
          selectedPropertyIds: element.props.selectedPropertyIds,
          reason: !propertyName ? 'нет propertyName' : 
                  !element.props.categoryIds?.length ? 'нет categoryIds' : 
                  'пользователь не выбрал свойство'
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        let response;
        let data;
        
        // Если есть фильтры, используем новый API для фильтрованных товаров
        console.log('PropertyFilter: Проверяем фильтры:', {
          hasFilters: !!element.props.filters,
          filtersKeys: element.props.filters ? Object.keys(element.props.filters) : [],
          filtersLength: element.props.filters ? Object.keys(element.props.filters).length : 0,
          filters: element.props.filters
        });
        
        if (element.props.filters && Object.keys(element.props.filters).length > 0) {
          const query = new URLSearchParams();
          element.props.categoryIds.forEach((id: string) => {
            query.append('categoryIds', id);
          });
          query.append('propertyName', propertyName);
          query.append('filters', JSON.stringify(element.props.filters));

          console.log('PropertyFilter: Запрос к API с фильтрами:', `/api/catalog/products/filtered?${query.toString()}`);
          
          response = await fetch(`/api/catalog/products/filtered?${query.toString()}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          data = await response.json();
          console.log('PropertyFilter: Ответ API с фильтрами:', data);
        } else {
          // Используем новый оптимизированный API
          console.log('PropertyFilter: Используем оптимизированный API для быстрой загрузки');
          const query = new URLSearchParams();
          element.props.categoryIds.forEach((id: string) => {
            query.append('categoryIds', id);
          });
          query.append('propertyName', propertyName);

          console.log('PropertyFilter: Запрос к оптимизированному API:', `/api/catalog/properties/values-with-images?${query.toString()}`);
          
          response = await fetch(`/api/catalog/properties/values-with-images?${query.toString()}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          data = await response.json();
          console.log('PropertyFilter: Ответ оптимизированного API:', data);
        }
        
        if (data.success) {
          let propertyOptions: PropertyOption[] = [];
          
          if (element.props.filters && Object.keys(element.props.filters).length > 0) {
            // Для фильтрованных данных
            if (data.uniqueValues && data.uniqueValues[propertyName]) {
              const propertyValues = data.uniqueValues[propertyName];
              propertyOptions = propertyValues.map((value: string) => ({
                value: value,
                label: value,
                count: undefined
              }));
            }
          } else {
            // Для оптимизированного API
            if (data.data && Array.isArray(data.data)) {
              propertyOptions = data.data.map((item: any) => ({
                value: item.value,
                label: item.value,
                count: item.count,
                image: item.image
              }));
              console.log('PropertyFilter: Получены оптимизированные данные:', propertyOptions);
            }
          }
          
          console.log('PropertyFilter: Опции для отображения:', propertyOptions);
          setOptions(propertyOptions);
          
          // Если это фильтрованные данные, загружаем изображения
          if (element.props.filters && Object.keys(element.props.filters).length > 0 && propertyOptions.length > 0) {
            const propertyValues = propertyOptions.map(opt => opt.value);
            console.log('PropertyFilter: Вызываем loadProductImages для фильтрованных данных');
            loadProductImages(propertyName, propertyValues);
          }
        } else {
          console.log('PropertyFilter: Нет данных или ошибка в ответе API');
          setOptions([]);
        }
      } catch (e: any) {
        setError(e.message || 'Ошибка загрузки значений свойства');
        console.error('Ошибка загрузки значений свойства:', e);
      } finally {
        setLoading(false);
      }
    };

    loadPropertyValues();
  }, [element.props.propertyName, element.props.categoryIds, element.props.selectedPropertyIds, element.props.filters]);

  // Функция для загрузки фото товаров для каждого значения свойства
  const loadProductImages = async (propertyName: string, propertyValues: string[]) => {
    console.log('PropertyFilter: loadProductImages вызвана с:', { propertyName, propertyValues, categoryIds: element.props.categoryIds });
    if (!element.props.categoryIds?.length) {
      console.log('PropertyFilter: loadProductImages прервана - нет categoryIds');
      return;
    }

    try {
      const imagePromises = propertyValues.map(async (value) => {
        const query = new URLSearchParams();
        element.props.categoryIds.forEach((id: string) => {
          query.append('categoryIds', id);
        });
        query.append('propertyName', propertyName);
        query.append('propertyValue', value);

        const response = await fetch(`/api/catalog/products/images?${query.toString()}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`PropertyFilter: API ответ для ${value}:`, data);
          return {
            value,
            image: data.images.length > 0 ? data.images[0].url : null,
            count: data.productCount !== undefined ? data.productCount : 0  // Получаем реальное количество товаров
          };
        }
        return { value, image: null, count: 0 };
      });

      const imageResults = await Promise.all(imagePromises);
      
      // Обновляем опции с изображениями и количеством товаров
      console.log('PropertyFilter: Обновляем опции с результатами изображений:', imageResults);
      setOptions(prevOptions => {
        console.log('PropertyFilter: setOptions вызвана с prevOptions:', prevOptions);
        console.log('PropertyFilter: imageResults:', imageResults);
        
        const updatedOptions = prevOptions.map(option => {
          const imageResult = imageResults.find(img => img.value === option.value);
          const updatedOption = {
            ...option,
            productImage: imageResult?.image || null,
            count: imageResult?.count !== undefined ? imageResult.count : 0  // Устанавливаем реальное количество товаров
          };
          console.log('PropertyFilter: Обновляем опцию:', {
            value: option.value,
            oldCount: option.count,
            newCount: updatedOption.count,
            imageResult: imageResult
          });
          return updatedOption;
        });
        console.log('PropertyFilter: Итоговые обновленные опции:', updatedOptions);
        return updatedOptions;
      });
    } catch (error) {
      console.error('Ошибка загрузки изображений товаров:', error);
    }
  };

  // Синхронизация с внешними фильтрами
  useEffect(() => {
    // Если элемент получил внешнее значение через связи
    if (element.props.selectedValue && element.props.selectedValue !== selectedValue) {
      setSelectedValue(element.props.selectedValue);
    }
  }, [element.props.selectedValue, selectedValue]);

  // Обработка внешних фильтров через связи
  useEffect(() => {
    if (element.props.filters && Object.keys(element.props.filters).length > 0) {
      console.log('🔍 PropertyFilter: Получены внешние фильтры:', element.props.filters);
      
      // Если есть фильтр по свойству, перезагружаем данные
      if (element.props.filters.propertyName && element.props.filters.propertyValue) {
        console.log('🔍 PropertyFilter: Перезагружаем данные с учетом фильтра:', {
          propertyName: element.props.filters.propertyName,
          propertyValue: element.props.filters.propertyValue,
          categoryIds: element.props.filters.categoryIds
        });
        
        // Сбрасываем состояние и перезагружаем данные
        setLoading(true);
        setError(null);
        setOptions([]);
        setSelectedValue('');
        
        // Загружаем отфильтрованные данные
        loadPropertyValues();
      }
    }
  }, [element.props.filters]);

  const handleValueChange = (value: string) => {
    setSelectedValue(value);
    
    // --- ДОБАВЛЕННЫЙ ЛОГ: Перед отправкой данных через onConnectionData ---
    console.log(`PropertyFilter [${element.id}]: handleValueChange. element.props.propertyName:`, element.props.propertyName, 'value:', value);
    
    // Уведомляем родительский компонент об изменении
    if (onFilterChange) {
      onFilterChange(element.props.propertyName, value);
    }
    
    // Отправляем данные через систему связей для синхронизации с другими фильтрами
    if (onConnectionData) {
      const connectionData = {
        type: 'filter',
        propertyName: element.props.propertyName,
        value: value,
        categoryIds: element.props.categoryIds
      };
      
      console.log('🔗 PropertyFilter отправляет данные:', {
        elementId: element.id,
        connectionData,
        hasOnConnectionData: !!onConnectionData
      });
      
      try {
        onConnectionData(element.id, connectionData);
        console.log('🔗 PropertyFilter: onConnectionData вызван успешно');
      } catch (error) {
        console.error('🔗 PropertyFilter: Ошибка при вызове onConnectionData:', error);
      }
    } else {
      console.log('🔗 PropertyFilter: onConnectionData НЕ ПЕРЕДАН!', {
        elementId: element.id,
        hasOnConnectionData: !!onConnectionData
      });
    }
    
    // Обновляем элемент
    onUpdate({
      props: {
        ...element.props,
        selectedValue: value
      }
    });
  };

  const clearSelection = () => {
    setSelectedValue('');
    
    if (onFilterChange) {
      onFilterChange(element.props.propertyName, '');
    }
    
    onUpdate({
      props: {
        ...element.props,
        selectedValue: ''
      }
    });
  };

  const getDisplayStyle = () => {
    switch (element.props.displayStyle) {
      case 'cards':
        return 'cards';
      case 'list':
        return 'list';
      case 'buttons':
        return 'buttons';
      default:
        return 'cards';
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-sm">Ошибка загрузки</div>
        </div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-sm">
            {!element.props.selectedPropertyIds?.length 
              ? 'Выберите свойство товара' 
              : loading 
                ? 'Загрузка...' 
                : error 
                  ? 'Ошибка загрузки' 
                  : 'Нет данных'
            }
          </div>
        </div>
      </div>
    );
  }

  // Логирование для диагностики
  console.log('PropertyFilter: Рендер компонента с options:', options);
  console.log('PropertyFilter: Рендер компонента с selectedValue:', selectedValue);

  return (
    <div 
      className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-auto"
      onClick={(e) => {
        // Пропускаем событие клика вверх для обработки в ElementRenderer
        console.log('🖱️ PropertyFilter: Клик по основному div, пропускаем событие вверх', {
          target: e.target,
          currentTarget: e.currentTarget,
          ctrlKey: e.ctrlKey,
          elementId: element.id
        });
        // НЕ вызываем stopPropagation, чтобы событие всплыло вверх к ElementRenderer
      }}
    >
      <div className="p-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {element.props.title || element.props.propertyName || 'Фильтр'}
          </h3>
          {selectedValue && (
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Опции */}
        <div className={`space-y-${getDisplayStyle() === 'list' ? '2' : '4'}`}>
          {getDisplayStyle() === 'cards' && (
            <div className={`grid gap-3 ${
              element.props.columns === 'auto' ? 'grid-cols-2 md:grid-cols-4' :
              element.props.columns === '1' ? 'grid-cols-1' :
              element.props.columns === '2' ? 'grid-cols-2' :
              element.props.columns === '3' ? 'grid-cols-3' :
              element.props.columns === '4' ? 'grid-cols-4' :
              element.props.columns === '5' ? 'grid-cols-5' :
              'grid-cols-2 md:grid-cols-4'
            }`}>
              {options.map((option) => {
                // Определяем размер карточки
                const cardSizeClasses = {
                  small: 'p-2 text-xs',
                  medium: 'p-3 text-sm',
                  large: 'p-4 text-base',
                  xlarge: 'p-6 text-lg'
                };
                
                const imageSizeClasses = {
                  small: 'h-12',
                  medium: 'h-16',
                  large: 'h-20',
                  xlarge: 'h-24'
                };
                
                const iconSizeClasses = {
                  small: 'text-lg',
                  medium: 'text-2xl',
                  large: 'text-3xl',
                  xlarge: 'text-4xl'
                };
                
                const sizeClass = cardSizeClasses[element.props.cardSize as keyof typeof cardSizeClasses] || cardSizeClasses.medium;
                const imageSizeClass = imageSizeClasses[element.props.cardSize as keyof typeof imageSizeClasses] || imageSizeClasses.medium;
                const iconSizeClass = iconSizeClasses[element.props.cardSize as keyof typeof iconSizeClasses] || iconSizeClasses.medium;
                
                return (
                  <div
                    key={option.value}
                    onClick={() => handleValueChange(option.value)}
                    className={`relative ${sizeClass} border-2 rounded-lg cursor-pointer transition-all ${
                      selectedValue === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Изображение или иконка */}
                    <div className={`w-full ${imageSizeClass} bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden`}>
                      {option.productImage ? (
                        <img 
                          src={option.productImage} 
                          alt={option.label} 
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            // Если изображение не загрузилось, показываем иконку
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : option.image ? (
                        <img src={option.image} alt={option.label} className="w-full h-full object-cover rounded" />
                      ) : (element.props.cardImage || element.props.cardImageUrl) ? (
                        <img 
                          src={element.props.cardImage || element.props.cardImageUrl} 
                          alt={option.label}
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            // Показываем иконку если изображение не загрузилось
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      
                      <div className={`${iconSizeClass} text-gray-400 ${option.productImage || option.image || (element.props.cardImage || element.props.cardImageUrl) ? 'hidden' : 'flex'}`}>
                        {element.props.propertyName === 'Domeo_Стиль Web' ? '🚪' : '📦'}
                      </div>
                    </div>
                    
                    {/* Название */}
                    <div className="text-center">
                      <div className={`font-medium ${
                        selectedValue === option.value ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </div>
                      {option.count !== undefined && option.count !== null && (
                        <div className="text-xs text-gray-500 mt-1">
                          {option.count} товаров
                        </div>
                      )}
                    </div>
                    
                    {/* Индикатор выбора */}
                    {selectedValue === option.value && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {getDisplayStyle() === 'buttons' && (
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleValueChange(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedValue === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                  {option.count && (
                    <span className="ml-1 text-xs opacity-75">
                      ({option.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {getDisplayStyle() === 'list' && (
            <div className="space-y-2">
              {options.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    name={element.props.propertyName}
                    value={option.value}
                    checked={selectedValue === option.value}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    {option.count !== undefined && option.count !== null && (
                      <div className="text-xs text-gray-500">{option.count} товаров</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Информация о выборе */}
        {selectedValue && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              Выбрано: <span className="font-medium">{selectedValue}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
