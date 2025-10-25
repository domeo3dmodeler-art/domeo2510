'use client';

import React, { useState, useEffect } from 'react';
import { BaseElement } from '../types';
import { extractUniquePropertyValues } from '@/lib/string-utils';
import { shouldShowFilters } from '@/lib/display-mode';
import { ConfiguratorPlaceholder } from './PlaceholderContent';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  properties: Record<string, string>;
  available: boolean;
}

interface ConfigurableProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  variants: ProductVariant[];
  configurableProperties: {
    id: string;
    name: string;
    type: 'select' | 'color' | 'size' | 'material';
    options: {
      value: string;
      label: string;
      priceModifier?: number;
      image?: string;
    }[];
  }[];
}

interface SelectedConfiguration {
  [propertyId: string]: string;
}

interface ProductConfiguratorAdvancedProps {
  element: BaseElement;
  onUpdate: (updates: Partial<BaseElement>) => void;
}

export function ProductConfiguratorAdvanced({ element, onUpdate }: ProductConfiguratorAdvancedProps) {
  const [products, setProducts] = useState<ConfigurableProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ConfigurableProduct | null>(null);
  const [selectedConfiguration, setSelectedConfiguration] = useState<SelectedConfiguration>({});
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [propertyFilters, setPropertyFilters] = useState<Record<string, any>>({});
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);

  // Загрузка свойств для фильтров
  useEffect(() => {
    const loadProperties = async () => {
      if (!element.props.selectedPropertyIds?.length) return;
      
      try {
        // Загружаем свойства
        const propertiesResponse = await fetch('/api/catalog/properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryIds: element.props.categoryIds
          })
        });
        
        if (propertiesResponse.ok) {
          const propertiesData = await propertiesResponse.json();
          const filteredProperties = propertiesData.properties?.filter((prop: any) => 
            element.props.selectedPropertyIds.includes(prop.id)
          ) || [];
          
          // Загружаем товары для получения реальных значений свойств
          const categoryId = element.props.categoryIds?.[0]; // Берем первую категорию
          const productsResponse = await fetch(`/api/catalog/products?categoryId=${categoryId}&limit=100`);
          
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            const products = productsData.products || [];
            
            // Извлекаем уникальные значения для каждого свойства
            const propertiesWithOptions = await Promise.all(
              filteredProperties.map(async (property: any) => {
                const options = await extractUniquePropertyValues(products, property.name);
                console.log(`Property "${property.name}": found ${options.length} unique values:`, options.map(o => o.value));
                
                return {
                  ...property,
                  options: options
                };
              })
            );
            
            setAvailableProperties(propertiesWithOptions);
          } else {
            setAvailableProperties(filteredProperties);
          }
        }
      } catch (error) {
        console.error('Error loading properties:', error);
      }
    };

    loadProperties();
  }, [element.props.selectedPropertyIds, element.props.categoryIds]);

  // Получение настроек отображения для свойства
  const getPropertyDisplaySettings = (propertyId: string) => {
    return element.props.propertyDisplaySettings?.[propertyId] || { displayType: 'input' };
  };

  // Загрузка конфигурируемых товаров
  useEffect(() => {
    const loadProducts = async () => {
      if (!element.props.categoryIds?.length) return;
      
      setLoading(true);
      try {
        const response = await fetch('/api/catalog/configurable-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryIds: element.props.categoryIds,
            limit: element.props.limit || 6
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
          if (data.products?.length > 0) {
            setSelectedProduct(data.products[0]);
          }
        }
      } catch (error) {
        console.error('Error loading configurable products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [element.props.categoryIds, element.props.limit]);

  // Расчет цены при изменении конфигурации
  useEffect(() => {
    if (!selectedProduct) return;

    let price = selectedProduct.basePrice;
    
    // Добавляем модификаторы цены от выбранных опций
    selectedProduct.configurableProperties.forEach(property => {
      const selectedValue = selectedConfiguration[property.id];
      if (selectedValue) {
        const option = property.options.find(opt => opt.value === selectedValue);
        if (option?.priceModifier) {
          price += option.priceModifier;
        }
      }
    });

    setCalculatedPrice(price);
  }, [selectedProduct, selectedConfiguration]);

  const handleConfigurationChange = (propertyId: string, value: string) => {
    setSelectedConfiguration(prev => ({
      ...prev,
      [propertyId]: value
    }));
  };

  const handleFilterChange = (propertyId: string, value: any) => {
    setPropertyFilters(prev => ({
      ...prev,
      [propertyId]: value
    }));
  };

  const clearFilter = (propertyId: string) => {
    setPropertyFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[propertyId];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setPropertyFilters({});
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const cartItem = {
      productId: selectedProduct.id,
      configuration: selectedConfiguration,
      price: calculatedPrice,
      quantity: 1
    };

    // TODO: Реализовать добавление в корзину
    console.log('Adding configured product to cart:', cartItem);
  };

  const getSelectedVariant = () => {
    if (!selectedProduct) return null;
    
    return selectedProduct.variants.find(variant => {
      return Object.entries(selectedConfiguration).every(([propertyId, value]) => {
        return variant.properties[propertyId] === value;
      });
    });
  };

  const renderPropertyFilters = () => {
    // Скрываем фильтры в режиме редактирования
    if (!shouldShowFilters('productConfiguratorAdvanced') || !availableProperties.length) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Фильтры</h3>
          {Object.keys(propertyFilters).length > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
            >
              Очистить все
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableProperties.map(property => {
            const displaySettings = getPropertyDisplaySettings(property.id);
            
            return (
              <div key={property.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{property.name}</h4>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">
                      {displaySettings.displayType}
                    </div>
                    {propertyFilters[property.id] && (
                      <button
                        onClick={() => clearFilter(property.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              

              {/* Отображение в зависимости от настроек */}
              {displaySettings.displayType === 'input' && (
                <input
                  type="text"
                  placeholder={`Поиск по ${property.name.toLowerCase()}...`}
                  value={propertyFilters[property.id]?.value || ''}
                  onChange={(e) => handleFilterChange(property.id, {
                    ...propertyFilters[property.id],
                    value: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              
              {displaySettings.displayType === 'chips' && (
                <div className="space-y-2">
                  {property.options?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {property.options.map((option: any) => (
                        <label key={option.value} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(propertyFilters[property.id]?.selectedChips || []).includes(option.value)}
                            onChange={(e) => {
                              const currentChips = propertyFilters[property.id]?.selectedChips || [];
                              const newChips = e.target.checked
                                ? [...currentChips, option.value]
                                : currentChips.filter((chip: string) => chip !== option.value);
                              
                              handleFilterChange(property.id, {
                                ...propertyFilters[property.id],
                                selectedChips: newChips,
                                value: newChips.length > 0 ? newChips : undefined
                              });
                            }}
                            className="mr-2 w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-700 px-2 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic">
                      Нет доступных значений для этого свойства
                    </div>
                  )}
                </div>
              )}
              
              {displaySettings.displayType === 'dropdown' && (
                <select
                  value={propertyFilters[property.id]?.value || ''}
                  onChange={(e) => handleFilterChange(property.id, {
                    ...propertyFilters[property.id],
                    value: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Все варианты</option>
                  {property.options?.map((option: any) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              
              {displaySettings.displayType === 'range' && (
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="От"
                    value={propertyFilters[property.id]?.min || ''}
                    onChange={(e) => handleFilterChange(property.id, {
                      ...propertyFilters[property.id],
                      min: e.target.value ? Number(e.target.value) : undefined,
                      value: { min: e.target.value ? Number(e.target.value) : undefined, max: propertyFilters[property.id]?.max }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="До"
                    value={propertyFilters[property.id]?.max || ''}
                    onChange={(e) => handleFilterChange(property.id, {
                      ...propertyFilters[property.id],
                      max: e.target.value ? Number(e.target.value) : undefined,
                      value: { min: propertyFilters[property.id]?.min, max: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {displaySettings.displayType === 'radio' && (
                <div className="space-y-2">
                  {property.options?.slice(0, 4).map((option: any) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        name={property.id}
                        value={option.value}
                        checked={propertyFilters[property.id]?.value === option.value}
                        onChange={(e) => handleFilterChange(property.id, {
                          ...propertyFilters[property.id],
                          value: e.target.value
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {displaySettings.displayType === 'color' && (
                <div className="flex flex-wrap gap-2">
                  {property.options?.slice(0, 8).map((option: any) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange(property.id, {
                        ...propertyFilters[property.id],
                        value: option.value
                      })}
                      className={`w-8 h-8 rounded border-2 ${
                        propertyFilters[property.id]?.value === option.value
                          ? 'border-gray-800'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: option.color || option.value }}
                      title={option.label}
                    />
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
        
        {/* Показ активных фильтров */}
        {Object.keys(propertyFilters).length > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(propertyFilters).map(([propertyId, filterData]) => {
                const property = availableProperties.find(p => p.id === propertyId);
                if (!property || !filterData?.value) return null;
                
                let displayValue = '';
                let filterChips: string[] = [];
                
                if (filterData.displayType === 'chips' && Array.isArray(filterData.value)) {
                  // Для плашек показываем каждую выбранную плашку отдельно
                  filterChips = filterData.value.map((chipValue: string) => {
                    const option = property.options?.find((opt: any) => opt.value === chipValue);
                    return option ? option.label : chipValue;
                  });
                } else if (filterData.displayType === 'range' && typeof filterData.value === 'object') {
                  displayValue = `${filterData.value.min || '0'} - ${filterData.value.max || '∞'}`;
                } else if (typeof filterData.value === 'string') {
                  const option = property.options?.find((opt: any) => opt.value === filterData.value);
                  displayValue = option ? option.label : filterData.value;
                }
                
                // Показываем плашки отдельно
                if (filterChips.length > 0) {
                  return filterChips.map((chip, index) => (
                    <span
                      key={`${propertyId}-${index}`}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                    >
                      {property.name}: {chip}
                      <button
                        onClick={() => {
                          const currentChips = filterData.selectedChips || [];
                          const newChips = currentChips.filter((c: string) => c !== filterData.value[index]);
                          if (newChips.length === 0) {
                            clearFilter(propertyId);
                          } else {
                            handleFilterChange(propertyId, {
                              ...filterData,
                              selectedChips: newChips,
                              value: newChips
                            });
                          }
                        }}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ✕
                      </button>
                    </span>
                  ));
                }
                
                // Показываем обычный фильтр
                if (displayValue) {
                  return (
                    <span
                      key={propertyId}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {property.name}: {displayValue}
                      <button
                        onClick={() => clearFilter(propertyId)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ✕
                      </button>
                    </span>
                  );
                }
                
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProductSelector = () => {
    const columns = element.props.columns || 3;
    const gridCols = columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                     columns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                     'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Выберите товар</h3>
        <div className={`grid ${gridCols} gap-4`}>
          {products.map(product => (
          <div
            key={product.id}
            onClick={() => setSelectedProduct(product)}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedProduct?.id === product.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <h4 className="font-medium text-gray-900 text-sm">{product.name}</h4>
            <p className="text-gray-600 text-sm mt-1">от {product.basePrice.toLocaleString()} ₽</p>
          </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConfiguration = () => {
    if (!selectedProduct) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Настройте {selectedProduct.name}
          </h3>
          
          {/* Изображение товара */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-6">
            {selectedProduct.images?.[0] ? (
              <img
                src={selectedProduct.images[0]}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Описание */}
        <div>
          <p className="text-gray-600">{selectedProduct.description}</p>
        </div>

        {/* Конфигурируемые свойства */}
        <div className="space-y-6">
          {selectedProduct.configurableProperties.map(property => (
            <div key={property.id}>
              <h4 className="font-medium text-gray-900 mb-3">{property.name}</h4>
              
              {property.type === 'color' ? (
                <div className="flex flex-wrap gap-3">
                  {property.options.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleConfigurationChange(property.id, option.value)}
                      className={`w-12 h-12 rounded-full border-2 ${
                        selectedConfiguration[property.id] === option.value
                          ? 'border-gray-900'
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: option.value }}
                      title={option.label}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.options.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleConfigurationChange(property.id, option.value)}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        selectedConfiguration[property.id] === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {option.label}
                      {option.priceModifier && (
                        <span className="block text-xs text-gray-500 mt-1">
                          {option.priceModifier > 0 ? '+' : ''}{option.priceModifier.toLocaleString()} ₽
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Цена и добавление в корзину */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-gray-900">
              {calculatedPrice.toLocaleString()} ₽
            </span>
            {getSelectedVariant() && (
              <span className="text-sm text-gray-500">
                Артикул: {getSelectedVariant()?.properties.sku || 'N/A'}
              </span>
            )}
          </div>
          
          <button
            onClick={handleAddToCart}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Добавить в корзину
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка товаров...</p>
        </div>
      </div>
    );
  }

  // Если фильтры скрыты, показываем placeholder
  if (!shouldShowFilters('productConfiguratorAdvanced') && element.props.showFilters !== false) {
    return (
      <div className="w-full h-full p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <ConfiguratorPlaceholder />
          </div>

          {/* Селектор товара */}
          {element.props.showProductSelector !== false && renderProductSelector()}

          {/* Конфигурация */}
          {element.props.showConfiguration !== false && renderConfiguration()}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Фильтры свойств */}
        {element.props.showFilters !== false && renderPropertyFilters()}

        {/* Селектор товара */}
        {element.props.showProductSelector !== false && renderProductSelector()}

        {/* Конфигурация */}
        {element.props.showConfiguration !== false && renderConfiguration()}
      </div>
    </div>
  );
}
