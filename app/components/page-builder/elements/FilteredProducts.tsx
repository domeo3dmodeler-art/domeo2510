'use client';

import React, { useState, useEffect } from 'react';
import { BaseElement } from '../types';

interface Product {
  id: string;
  name: string;
  base_price: number;
  images: { url: string }[];
  properties?: Record<string, any>;
}

interface FilteredProductsProps {
  element: BaseElement;
  onUpdate: (updates: Partial<BaseElement>) => void;
  filters?: Record<string, any>;
  onConnectionData?: (sourceElementId: string, data: any) => void;
}

export function FilteredProducts({ element, onUpdate, filters = {}, onConnectionData }: FilteredProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Загружаем товары с учетом фильтров
  useEffect(() => {
    const loadProducts = async () => {
      if (!element.props.categoryIds?.length) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        console.log('🔍 FilteredProducts: Загрузка товаров с фильтрами:', {
          categoryIds: element.props.categoryIds,
          filters,
          limit: element.props.limit || 12
        });

        // Используем новый API endpoint для фильтрованных товаров
        const response = await fetch('/api/catalog/products/filtered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryIds: element.props.categoryIds,
            filters: filters, // ✅ Используем переданные фильтры
            limit: element.props.limit || 12
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 FilteredProducts: Товары загружены:', {
            count: data.products?.length || 0,
            total: data.total || 0,
            filters
          });
          
          setProducts(data.products || []);
          setTotalCount(data.total || data.products?.length || 0);
          
          // Отправляем данные о загруженных товарах через систему связей
          if (onConnectionData) {
            onConnectionData(element.id, {
              type: 'productsLoaded',
              products: data.products || [],
              total: data.total || 0,
              filters: filters
            });
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (e: any) {
        setError(e.message || 'Ошибка загрузки товаров');
        console.error('🔍 FilteredProducts: Ошибка загрузки товаров:', e);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [element.props.categoryIds, element.props.limit, filters, onConnectionData]); // ✅ Добавить filters и onConnectionData в зависимости

  const getDisplayLayout = () => {
    switch (element.props.layout) {
      case 'grid':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      case 'list':
        return 'grid-cols-1';
      case 'compact':
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  // Функция для добавления товара в корзину через систему связей
  const handleAddToCart = (product: Product) => {
    console.log('🛒 FilteredProducts: Добавление в корзину:', product);
    
    if (onConnectionData) {
      onConnectionData(element.id, {
        type: 'addToCart',
        product: {
          id: product.id,
          name: product.name,
          price: product.base_price,
          image: product.images?.[0]?.url,
          quantity: 1
        }
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">Загрузка товаров...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-sm">Ошибка: {error}</div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-sm">Товары не найдены</div>
          {Object.keys(filters).length > 0 && (
            <div className="text-xs mt-1">Попробуйте изменить фильтры</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-auto">
      <div className="p-4">
        {/* Заголовок с количеством */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {element.props.title || 'Товары'}
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({totalCount})
              </span>
            )}
          </h3>
          
          {/* Показать активные фильтры */}
          {Object.keys(filters).length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Фильтры:</span>
              {Object.entries(filters).map(([key, value]) => (
                value && (
                  <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {value}
                  </span>
                )
              ))}
            </div>
          )}
        </div>

        {/* Сетка товаров */}
        <div className={`grid ${getDisplayLayout()} gap-4`}>
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                element.props.layout === 'list' ? 'flex' : 'flex flex-col'
              }`}
            >
              {/* Изображение */}
              <div className={`${element.props.layout === 'list' ? 'w-32 h-24 flex-shrink-0' : 'w-full h-32'} bg-gray-100`}>
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.png';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <div className="text-2xl">📦</div>
                  </div>
                )}
              </div>

              {/* Информация о товаре */}
              <div className={`p-3 ${element.props.layout === 'list' ? 'flex-1' : 'flex-1'}`}>
                <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                  {product.name}
                </h4>
                
                {/* Показываем свойства товара если они есть */}
                {product.properties && Object.keys(product.properties).length > 0 && (
                  <div className="space-y-1 mb-2">
                    {Object.entries(product.properties).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="text-xs text-gray-500">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatPrice(product.base_price)}
                  </div>
                  
                  {element.props.showAddToCart !== false && (
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                    >
                      В корзину
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Кнопка "Показать больше" если есть больше товаров */}
        {totalCount > products.length && (
          <div className="mt-4 text-center">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              Показать больше ({totalCount - products.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

