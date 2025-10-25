'use client';

import React, { useState, useEffect } from 'react';
import { BaseElement } from '../types';
import { useFilterConnection } from '../context/ConnectionsContext';

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
  image?: string | null;
  productImage?: string; // Фото товара из каталога
}

interface DisplaySettings {
  showImages: boolean;
  showCounts: boolean;
  cardLayout: 'horizontal' | 'vertical';
  columns: number;
  showProductCards: boolean;
  maxProducts: number;
  customColumns: boolean;
  customProducts: boolean;
  customColumnsValue: number;
  customProductsValue: number;
  propertyCardImage: string;
  maxElements: number; // Максимальное количество элементов для отображения
  showAllElements: boolean; // Показывать все элементы
  individualImages: { [key: string]: string }; // Индивидуальные изображения для каждой опции
  // Настройки размера карточек
  autoSize: boolean; // Автоматический расчет размеров
  cardHeight: number; // Высота карточки в пикселях
  customCardHeight: boolean; // Использовать произвольную высоту
  individualCardHeights: { [key: string]: number }; // Индивидуальная высота для каждой карточки
  cardWidth: number; // Ширина карточки в пикселях
  customCardWidth: boolean; // Использовать произвольную ширину
  individualCardWidths: { [key: string]: number }; // Индивидуальная ширина для каждой карточки
  // Настройки заголовка и подписей
  componentTitle: string; // Заголовок компонента
  labelPosition: 'inside' | 'outside'; // Позиция подписи: внутри карточки или под карточкой
}

export function PropertyFilter({ element, onUpdate, onFilterChange, onConnectionData }: PropertyFilterProps) {
  const [options, setOptions] = useState<PropertyOption[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Используем систему связей
  const { currentValue, globalValue, updateFilter, clearCurrentFilter, isConnected } = useFilterConnection(
    element.id, 
    element.props.propertyName || ''
  );
  
  // Определяем выбранное значение (приоритет: локальное > глобальное)
  const selectedValue = currentValue || globalValue || '';
  
  // Настройки отображения
  const displaySettings: DisplaySettings = {
    showImages: true,
    showCounts: true,
    cardLayout: 'vertical',
    columns: 3,
    showProductCards: false, // По умолчанию выключено
    maxProducts: 12,
    customColumns: true, // КАРДИНАЛЬНОЕ ИСПРАВЛЕНИЕ: По умолчанию включено
    customProducts: false,
    customColumnsValue: 3,
    customProductsValue: 12,
    propertyCardImage: '',
    maxElements: 6, // По умолчанию показываем 6 элементов
    showAllElements: false, // По умолчанию ограничиваем количество
    individualImages: {}, // Индивидуальные изображения для каждой опции
    // Настройки размера карточек
    autoSize: true, // Автоматический расчет размеров по умолчанию
    cardHeight: 150, // Высота карточки по умолчанию
    customCardHeight: true, // Использовать произвольную высоту по умолчанию
    individualCardHeights: {}, // Индивидуальная высота для каждой карточки
    cardWidth: 200, // Ширина карточки по умолчанию
    customCardWidth: true, // Использовать произвольную ширину по умолчанию
    individualCardWidths: {}, // Индивидуальная ширина для каждой карточки
    // Настройки заголовка и подписей
    componentTitle: 'Фильтр свойств', // Заголовок компонента по умолчанию
    labelPosition: 'inside', // Подпись внутри карточки по умолчанию
    ...element.props.displaySettings // Объединяем с настройками из props
  };

  // Автоматический расчет количества колонок на основе размера компонента
  const calculateOptimalColumns = () => {
    const componentWidth = element.props.width || 400; // Увеличиваем базовую ширину
    const cardMinWidth = displaySettings.cardLayout === 'vertical' ? 100 : 150; // Уменьшаем минимальную ширину карточки
    const gap = 12; // Отступ между карточками
    const padding = 32; // Отступы компонента
    
    const availableWidth = componentWidth - padding;
    const optimalColumns = Math.max(1, Math.floor(availableWidth / (cardMinWidth + gap)));
    
    console.log('🔧 PropertyFilter: Расчет колонок', {
      componentWidth,
      cardMinWidth,
      gap,
      padding,
      availableWidth,
      optimalColumns,
      customColumns: displaySettings.customColumns,
      displaySettingsColumns: displaySettings.columns
    });
    
    return Math.min(optimalColumns, 6); // Максимум 6 колонок
  };

  // КАРДИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Всегда используем количество колонок из настроек
  // Если пользователь выбрал количество колонок, используем его независимо от customColumns
  const effectiveColumns = displaySettings.columns || calculateOptimalColumns();

  // Автоматический расчет размеров карточек на основе размера компонента
  const calculateOptimalCardSize = () => {
    const componentWidth = element.props.width || 400;
    const componentHeight = element.props.height || 300;
    
    // Рассчитываем оптимальную ширину карточки
    const gap = 12; // gap-3 = 12px
    const padding = 24; // p-3 = 12px с каждой стороны
    const availableWidth = componentWidth - padding;
    const cardWidth = Math.max(100, Math.min(300, Math.floor((availableWidth - (effectiveColumns - 1) * gap) / effectiveColumns)));
    
    // Рассчитываем оптимальную высоту карточки
    const availableHeight = componentHeight - 100; // Оставляем место для заголовка и других элементов
    const cardHeight = Math.max(80, Math.min(250, Math.floor(availableHeight / Math.ceil(options.length / effectiveColumns))));
    
    return { cardWidth, cardHeight };
  };

  // Определяем эффективные размеры карточек
  const effectiveCardSize = displaySettings.autoSize ? calculateOptimalCardSize() : { 
    cardWidth: displaySettings.cardWidth, 
    cardHeight: displaySettings.cardHeight 
  };
  
  console.log('🔧 PropertyFilter: Эффективное количество колонок', {
    effectiveColumns,
    customColumns: displaySettings.customColumns,
    displaySettingsColumns: displaySettings.columns,
    calculatedColumns: calculateOptimalColumns(),
    elementWidth: element.props.width,
    cardLayout: displaySettings.cardLayout,
    optionsCount: options.length,
    maxElements: displaySettings.maxElements,
    showAllElements: displaySettings.showAllElements,
    individualImages: displaySettings.individualImages, // ДОБАВЛЕНО: логирование индивидуальных изображений
    propertyCardImage: displaySettings.propertyCardImage // ДОБАВЛЕНО: логирование общего изображения
  });

  // --- ДОБАВЛЕННЫЙ ЛОГ: При рендере компонента ---
  console.log(`PropertyFilter [${element.id}]: Рендер. element.props.propertyName:`, element.props.propertyName);
  console.log(`PropertyFilter [${element.id}]: Все props:`, element.props);
  console.log(`PropertyFilter [${element.id}]: selectedValue:`, selectedValue);
  console.log(`PropertyFilter [${element.id}]: products.length:`, products.length);
  console.log(`PropertyFilter [${element.id}]: displaySettings.showProductCards:`, displaySettings.showProductCards);
  console.log(`PropertyFilter [${element.id}]: displaySettings.cardLayout:`, displaySettings.cardLayout);

  // Функция для загрузки товаров
  const loadProducts = async (propertyName: string, propertyValue: string) => {
    if (!displaySettings.showProductCards) return;
    
    try {
      console.log('PropertyFilter: Загрузка товаров', { propertyName, propertyValue });
      
      const response = await fetch('/api/catalog/products/filtered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryIds: element.props.categoryIds,
          filters: {
            [propertyName]: propertyValue
          },
          limit: displaySettings.maxProducts
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('PropertyFilter: Товары загружены:', data);
        setProducts(data.products || []);
      } else {
        console.error('PropertyFilter: Ошибка загрузки товаров:', response.status);
        setProducts([]);
      }
    } catch (error) {
      console.error('PropertyFilter: Ошибка загрузки товаров:', error);
      setProducts([]);
    }
  };

  const loadAllProducts = async () => {
    console.log('🔄 PropertyFilter: loadAllProducts вызвана', {
      showProductCards: displaySettings.showProductCards,
      categoryIds: element.props.categoryIds,
      maxProducts: displaySettings.maxProducts
    });
    
    if (!displaySettings.showProductCards) {
      console.log('🔄 PropertyFilter: showProductCards = false, пропускаем загрузку');
      return;
    }
    
    try {
      console.log('🔄 PropertyFilter: Отправляем запрос на загрузку всех товаров', { 
        categoryIds: element.props.categoryIds,
        filters: {},
        limit: displaySettings.maxProducts
      });
      
      const response = await fetch('/api/catalog/products/filtered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryIds: element.props.categoryIds,
          filters: {},
          limit: displaySettings.maxProducts
        }),
      });

      console.log('🔄 PropertyFilter: Получен ответ от API', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔄 PropertyFilter: Все товары загружены:', {
          productsCount: data.products?.length || 0,
          data
        });
        setProducts(data.products || []);
      } else {
        console.error('🔄 PropertyFilter: Ошибка загрузки всех товаров:', response.status);
        setProducts([]);
      }
    } catch (error) {
      console.error('🔄 PropertyFilter: Ошибка загрузки всех товаров:', error);
      setProducts([]);
    }
  };

  // Функция для загрузки значений свойства
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
      setError(null);
      setOptions([]);
      // Значение теперь управляется через систему связей
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
      console.log('PropertyFilter: Начинаем загрузку значений для свойства:', propertyName);
      
        let response;
        let data;
        
      if (element.props.filters && Object.keys(element.props.filters).length > 0) {
        console.log('🔍 PropertyFilter: Используем фильтрованные данные');
        
          const query = new URLSearchParams();
          element.props.categoryIds.forEach((id: string) => {
            query.append('categoryIds', id);
          });
        query.append('propertyNames', propertyName);
          query.append('filters', JSON.stringify(element.props.filters));

          console.log('PropertyFilter: Запрос к API с фильтрами:', `/api/catalog/products/filtered?${query.toString()}`);
          
          response = await fetch(`/api/catalog/products/filtered?${query.toString()}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          data = await response.json();
          console.log('PropertyFilter: Ответ API с фильтрами:', data);
        } else {
        console.log('🔍 PropertyFilter: Используем обычные данные без фильтров');
        
          const query = new URLSearchParams();
          element.props.categoryIds.forEach((id: string) => {
            query.append('categoryIds', id);
          });
        query.append('propertyNames', propertyName);

        console.log('PropertyFilter: Запрос к API:', `/api/catalog/properties/unique-values?${query.toString()}`);
          
        response = await fetch(`/api/catalog/properties/unique-values?${query.toString()}`);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          data = await response.json();
        console.log('PropertyFilter: Ответ API:', data);
      }

      // Обрабатываем ответ
      let uniqueValues: string[] = [];
      
      if (data.success && data.uniqueValues && data.uniqueValues[propertyName]) {
        uniqueValues = data.uniqueValues[propertyName];
        console.log('PropertyFilter: Уникальные значения из API:', uniqueValues);
      } else if (Array.isArray(data)) {
        uniqueValues = data;
        console.log('PropertyFilter: Уникальные значения из API (массив):', uniqueValues);
      } else if (data.data && Array.isArray(data.data)) {
        uniqueValues = data.data;
        console.log('PropertyFilter: Уникальные значения из API (data.data):', uniqueValues);
          } else {
        console.log('PropertyFilter: Неожиданная структура ответа API:', data);
        uniqueValues = [];
      }

      // Загружаем все данные одним запросом (оптимизированно)
        const query = new URLSearchParams();
        element.props.categoryIds.forEach((id: string) => {
          query.append('categoryIds', id);
        });
        query.append('propertyName', propertyName);

      console.log('PropertyFilter: Запрос к оптимизированному API:', `/api/catalog/properties/values-with-data?${query.toString()}`);
      
      const dataResponse = await fetch(`/api/catalog/properties/values-with-data?${query.toString()}`);
      
      if (!dataResponse.ok) {
        throw new Error(`HTTP error! status: ${dataResponse.status}`);
      }
      
      const dataWithCountsAndImages = await dataResponse.json();
      console.log('PropertyFilter: Ответ оптимизированного API:', dataWithCountsAndImages);
      
      const optionsWithImages = uniqueValues.map(value => ({
            value,
        label: value,
        count: dataWithCountsAndImages.values[value]?.count || 0,
        image: dataWithCountsAndImages.values[value]?.image || null
      }));

      console.log('PropertyFilter: Опции с изображениями:', optionsWithImages);
      
      setOptions(optionsWithImages);
      setLoading(false);
      
      // Если есть выбранное значение, оно будет синхронизировано через систему связей
      if (element.props.selectedValue) {
        // Значение уже синхронизировано через систему связей
      }
      
    } catch (error) {
      console.error('PropertyFilter: Ошибка загрузки значений:', error);
      setError('Ошибка загрузки значений свойства');
      setLoading(false);
    }
  };

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
      // Значение теперь управляется через систему связей
      return;
    }
    
    // Принудительно сбрасываем состояние при изменении propertyName
    if (element.props.propertyName) {
      console.log(`PropertyFilter [${element.id}]: propertyName изменился, сбрасываем состояние`);
      setLoading(true);
      setError(null);
      setOptions([]);
      // Значение теперь управляется через систему связей
    }
    
    loadPropertyValues();
  }, [element.props.propertyName, element.props.categoryIds, element.props.selectedPropertyIds, element.props.filters]);

  // Обрабатываем внешние фильтры
  useEffect(() => {
    console.log('🔍 PropertyFilter: Проверяем внешние фильтры:', {
      elementId: element.id,
      hasFilters: !!element.props.filters,
      filters: element.props.filters,
      filtersKeys: element.props.filters ? Object.keys(element.props.filters) : []
    });
    
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
        // Значение теперь управляется через систему связей
        
        // Загружаем отфильтрованные данные
        loadPropertyValues();
      }
    } else {
      console.log('🔍 PropertyFilter: Нет внешних фильтров, используем обычную загрузку');
    }
  }, [element.props.filters]);

  // Загружаем товары при изменении выбранного значения или при загрузке компонента
  useEffect(() => {
    console.log('🔄 PropertyFilter: useEffect для загрузки товаров', {
      elementId: element.id,
      propertyName: element.props.propertyName,
      selectedValue,
      showProductCards: displaySettings.showProductCards,
      categoryIds: element.props.categoryIds,
      categoryIdsLength: element.props.categoryIds?.length
    });
    
    if (element.props.propertyName) {
      if (selectedValue) {
        console.log('🔄 PropertyFilter: Загружаем товары для выбранного значения:', selectedValue);
        // Загружаем товары для выбранного значения
        loadProducts(element.props.propertyName, selectedValue);
      } else if (displaySettings.showProductCards && element.props.categoryIds?.length > 0) {
        console.log('🔄 PropertyFilter: Загружаем все товары из категорий');
        // Загружаем все товары из категорий, если нет выбранного значения
        loadAllProducts();
      } else {
        console.log('🔄 PropertyFilter: Условия не выполнены для загрузки товаров', {
          showProductCards: displaySettings.showProductCards,
          hasCategoryIds: !!element.props.categoryIds,
          categoryIdsLength: element.props.categoryIds?.length
        });
      }
    } else {
      console.log('🔄 PropertyFilter: propertyName не определен');
    }
  }, [element.props.propertyName, selectedValue, displaySettings.showProductCards, element.props.categoryIds]);

  // Принудительная загрузка товаров при инициализации компонента
  useEffect(() => {
    console.log('🔄 PropertyFilter: Принудительная загрузка товаров при инициализации', {
      elementId: element.id,
      propertyName: element.props.propertyName,
      categoryIds: element.props.categoryIds,
      showProductCards: displaySettings.showProductCards
    });
    
    // Загружаем товары через небольшую задержку, чтобы убедиться, что все props загружены
    const timer = setTimeout(() => {
      if (displaySettings.showProductCards && element.props.categoryIds?.length > 0) {
        console.log('🔄 PropertyFilter: Принудительно загружаем товары');
        loadAllProducts();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []); // Запускается только один раз при монтировании

  // Логирование состояния карточек свойств
  useEffect(() => {
    console.log('🔄 PropertyFilter: Состояние карточек свойств', {
      elementId: element.id,
      optionsLength: options.length,
      options: options,
      loading: loading,
      error: error,
      propertyName: element.props.propertyName,
      categoryIds: element.props.categoryIds
    });
  }, [options, loading, error, element.props.propertyName, element.props.categoryIds]);

  const handleValueChange = (value: string) => {
    console.log(`🔍 PropertyFilter [${element.id}]: handleValueChange НАЧАЛО`, {
      elementId: element.id,
      propertyName: element.props.propertyName,
      oldValue: selectedValue,
      newValue: value,
      hasOnConnectionData: !!onConnectionData
    });
    
    // Обновляем фильтр через систему связей
    updateFilter(value, element.props.categoryIds || []);
    
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
    
    // Загружаем товары для выбранного значения
    if (element.props.propertyName && value) {
      loadProducts(element.props.propertyName, value);
    }
    
    // Обновляем элемент
    onUpdate({
      props: {
        ...element.props,
        selectedValue: value
      }
    });
    
    console.log(`🔍 PropertyFilter [${element.id}]: handleValueChange КОНЕЦ`);
  };

  const clearSelection = () => {
    clearCurrentFilter();
    
    if (onFilterChange) {
      onFilterChange(element.props.propertyName, '');
    }
    
    // Отправляем данные через систему связей
    if (onConnectionData) {
      const connectionData = {
        type: 'filter',
        propertyName: element.props.propertyName,
        value: '',
        categoryIds: element.props.categoryIds
      };
      
      onConnectionData(element.id, connectionData);
    }
    
    onUpdate({
      props: {
        ...element.props,
        selectedValue: ''
      }
    });
  };

  if (loading) {
    return (
      <div className="w-full h-full p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full p-4 border border-red-200 rounded-lg bg-red-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm font-medium">Ошибка загрузки</div>
          <div className="text-xs">{error}</div>
        </div>
      </div>
    );
  }

  if (!element.props.propertyName) {
    return (
      <div className="w-full h-full p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🔧</div>
          <div className="text-sm font-medium">Настройте фильтр</div>
          <div className="text-xs">Выберите категории и свойство в панели справа</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 border border-gray-300 rounded-lg bg-white max-h-96 overflow-hidden flex flex-col">
      <div className="mb-3 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          {displaySettings.componentTitle}
        </h3>
          {selectedValue && (
          <div className="text-xs text-gray-500">
            Выбрано: {selectedValue}
          </div>
          )}
        </div>

      <div className="flex-1 overflow-y-auto">
        <div 
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${effectiveColumns}, ${effectiveCardSize.cardWidth}px)`, // Эффективная ширина карточек
            gridAutoRows: `${effectiveCardSize.cardHeight}px` // Эффективная высота карточек
          }}
        >
        {options.slice(0, displaySettings.showAllElements ? options.length : displaySettings.maxElements).map((option) => (
          <div key={option.value} className="w-full">
            {/* Карточка */}
            <div
              className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 w-full flex flex-col ${
                selectedValue === option.value
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
              style={{
                height: displaySettings.individualCardHeights[option.value] 
                  ? `${displaySettings.individualCardHeights[option.value]}px` 
                  : `${effectiveCardSize.cardHeight}px`,
                width: displaySettings.individualCardWidths[option.value] 
                  ? `${displaySettings.individualCardWidths[option.value]}px` 
                  : `${effectiveCardSize.cardWidth}px`
              }}
              onClick={() => handleValueChange(option.value)}
            >
              {/* Изображение и информация */}
              <div className={`${displaySettings.cardLayout === 'vertical' ? 'flex flex-col h-full' : 'flex items-start space-x-3 h-full'}`}>
                <div className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-16 mb-2 flex-shrink-0' : 'w-12 h-12 flex-shrink-0'}`}>
                  {(() => {
                    console.log('🖼️ PropertyFilter: Проверка изображений для опции', {
                      optionValue: option.value,
                      optionLabel: option.label,
                      individualImage: displaySettings.individualImages[option.value],
                      propertyCardImage: displaySettings.propertyCardImage,
                      optionImage: option.image,
                      individualImages: displaySettings.individualImages
                    });
                    
                    if (displaySettings.individualImages && displaySettings.individualImages[option.value]) {
                      return (
                        <img
                          src={displaySettings.individualImages[option.value]}
                          alt={option.label} 
                          className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
                        />
                      );
                    } else if (displaySettings.propertyCardImage) {
                      return (
                        <img
                          src={displaySettings.propertyCardImage}
                          alt={option.label} 
                          className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
                        />
                      );
                    } else if (option.image) {
                      return (
                        <img 
                          src={option.image}
                          alt={option.label}
                          className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} object-cover rounded-lg border border-gray-200`}
                        />
                      );
                    } else {
                      return (
                        <div className={`${displaySettings.cardLayout === 'vertical' ? 'w-full h-full' : 'w-12 h-12'} bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center`}>
                          <svg className={`${displaySettings.cardLayout === 'vertical' ? 'w-8 h-8' : 'w-6 h-6'} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      );
                    }
                  })()}
                </div>
                
                {/* Информация о свойстве - только если подпись внутри карточки */}
                {displaySettings.labelPosition === 'inside' && (
                  <div className={`${displaySettings.cardLayout === 'vertical' ? 'flex-1 flex flex-col justify-center text-center' : 'flex-1 min-w-0'}`}>
                    <h4 className={`text-sm font-medium text-gray-900 ${displaySettings.cardLayout === 'vertical' ? 'mb-1' : 'truncate'}`}>
                      {option.label}
                    </h4>
                    {option.count !== undefined && displaySettings.showCounts && (
                      <p className="text-xs text-gray-500">
                        {option.count} товаров
                      </p>
                    )}
                  </div>
                )}
                
                {/* Индикатор выбора */}
                {selectedValue === option.value && (
                  <div className={`${displaySettings.cardLayout === 'vertical' ? 'absolute top-2 right-2' : 'flex-shrink-0'}`}>
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Подпись под карточкой - только если подпись снаружи */}
            {displaySettings.labelPosition === 'outside' && (
              <div className="mt-2 text-center">
                <h4 className="text-sm font-medium text-gray-900">
                  {option.label}
                </h4>
                {option.count !== undefined && displaySettings.showCounts && (
                  <p className="text-xs text-gray-500">
                    {option.count} товаров
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        </div>
            </div>

      {selectedValue && (
                <button
          onClick={clearSelection}
          className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline flex-shrink-0"
        >
          Очистить выбор
        </button>
      )}

      {options.length === 0 && !loading && (
        <div className="text-sm text-gray-500 text-center py-4 flex-shrink-0">
          Нет доступных значений
            </div>
          )}

      {/* Отображение товаров - только если НЕ выбрано свойство */}
      {displaySettings.showProductCards && !selectedValue && (
        <div className="mt-6 flex-shrink-0 w-full">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Товары {products.length > 0 ? `(${products.length})` : '(загрузка...)'}
          </h4>
          
          {products.length > 0 ? (
            <div 
              className="grid gap-4 w-full"
              style={{
                gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`
              }}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                    displaySettings.cardLayout === 'vertical' ? 'flex flex-col' : 'flex'
                  }`}
                >
                  {/* Изображение товара */}
                  {displaySettings.showImages && (
                    <div className={`${displaySettings.cardLayout === 'vertical' ? 'aspect-square' : 'w-24 h-24 flex-shrink-0'}`}>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className={`w-full h-full object-cover ${
                            displaySettings.cardLayout === 'vertical' ? '' : 'rounded-l-lg'
                          }`}
                        />
                      ) : (
                        <div className={`w-full h-full bg-gray-100 flex items-center justify-center ${
                          displaySettings.cardLayout === 'vertical' ? '' : 'rounded-l-lg'
                        }`}>
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Информация о товаре */}
                  <div className={`p-3 ${displaySettings.cardLayout === 'vertical' ? 'flex-1' : 'flex-1'}`}>
                    <h5 className="text-sm font-medium text-gray-900 truncate mb-1">
                      {product.name}
                    </h5>
                    {product.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {product.description}
                      </p>
                    )}
                    {product.price && (
                      <div className="text-sm font-semibold text-blue-600">
                        {product.price} ₽
            </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">⏳</div>
              <div className="text-sm">Загрузка товаров...</div>
              <div className="text-xs">Пожалуйста, подождите</div>
            </div>
          )}
          </div>
        )}
    </div>
  );
}