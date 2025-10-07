'use client';

import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Package, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { CartItem } from '../../lib/cart/types';
import ProductSelector from './ProductSelector';
import { useCart } from '../../hooks/useCart';

interface MultiCategoryCartProps {
  className?: string;
}

export default function MultiCategoryCart({ className = "" }: MultiCategoryCartProps) {
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');

  const {
    cart,
    isLoading,
    updateQuantity,
    removeItem,
    clearCart,
    getCategoryCount,
    getItemsByCategory
  } = useCart();

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        await removeItem(itemId);
      } else {
        await updateQuantity(itemId, newQuantity);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Вы уверены, что хотите очистить корзину?')) {
      try {
        await clearCart();
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  };

  const handleProductAdded = (product: any) => {
    console.log('Product added to cart:', product);
    setShowProductSelector(false);
  };

  // Группируем товары по категориям
  const groupedItems = cart?.items.reduce((acc, item) => {
    const categoryId = item.categoryId;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryName: item.categoryName,
        items: []
      };
    }
    acc[categoryId].items.push(item);
    return acc;
  }, {} as Record<string, { categoryName: string; items: CartItem[] }>) || {};

  const filteredGroupedItems = selectedCategoryFilter 
    ? { [selectedCategoryFilter]: groupedItems[selectedCategoryFilter] }
    : groupedItems;

  // Получаем уникальные категории для фильтра
  const categories = Object.keys(groupedItems).map(categoryId => ({
    id: categoryId,
    name: groupedItems[categoryId].categoryName
  }));

  const categoryCount = getCategoryCount();

  if (!cart) {
    return (
      <div className={`p-4 border-2 border-dashed border-gray-300 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <ShoppingCart className="h-12 w-12 mx-auto mb-2" />
          <p>Загрузка корзины...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Корзина ({cart.items.length})
            </h3>
            <span className="text-sm text-gray-500">
              из {categoryCount} категорий
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowProductSelector(!showProductSelector)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить товары
            </Button>
            {cart.items.length > 0 && (
              <Button
                variant="outline"
                onClick={handleClearCart}
                disabled={isLoading}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Очистить
              </Button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 1 && (
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все категории</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name} ({groupedItems[category.id]?.items.length || 0})
                </option>
              ))}
            </select>
            {selectedCategoryFilter && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCategoryFilter('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Cart Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Товаров:</span>
              <span className="ml-1 font-medium">{cart.items.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Категорий:</span>
              <span className="ml-1 font-medium">{categoryCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Сумма:</span>
              <span className="ml-1 font-medium">
                {cart.subtotal.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div>
              <span className="text-gray-600">Итого:</span>
              <span className="ml-1 font-semibold text-blue-600">
                {cart.total.toLocaleString('ru-RU')} ₽
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selector */}
      {showProductSelector && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <ProductSelector onProductAdded={handleProductAdded} />
        </div>
      )}

      {/* Items by Category */}
      {cart.items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">Корзина пуста</p>
            <p className="text-sm">Добавьте товары из разных категорий</p>
            <Button
              onClick={() => setShowProductSelector(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Начать покупки
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredGroupedItems).map(([categoryId, categoryData]) => (
            <CategorySection
              key={categoryId}
              categoryName={categoryData.categoryName}
              items={categoryData.items}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* Cart Totals */}
      {cart.items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <h4 className="font-medium text-gray-900 mb-3">Итоги</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Товары:</span>
              <span className="font-medium">
                {cart.subtotal.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            
            {cart.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Скидка:</span>
                <span>-{cart.discount.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            
            {cart.deliveryCost > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Доставка:</span>
                <span>{cart.deliveryCost.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            
            {cart.installationCost > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Установка:</span>
                <span>{cart.installationCost.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            
            {cart.tax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">НДС ({cart.taxRate}%):</span>
                <span>{cart.tax.toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
            
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Итого:</span>
                <span className="text-blue-600">
                  {cart.total.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Компонент секции категории
interface CategorySectionProps {
  categoryName: string;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isLoading: boolean;
}

function CategorySection({ categoryName, items, onUpdateQuantity, onRemoveItem, isLoading }: CategorySectionProps) {
  const totalCategoryValue = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-gray-600" />
            <h4 className="font-medium text-gray-900">{categoryName}</h4>
            <span className="text-sm text-gray-500">({items.length} товаров)</span>
          </div>
          <div className="text-sm font-medium text-blue-600">
            {totalCategoryValue.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {items.map(item => (
          <CartItemCard
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveItem}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

// Компонент карточки товара в корзине
interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  isLoading: boolean;
}

function CartItemCard({ item, onUpdateQuantity, onRemove, isLoading }: CartItemCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h5 className="font-medium text-gray-900 truncate">
            {item.productName}
          </h5>
          <p className="text-sm text-gray-500">
            {item.productSku} • {item.categoryName}
          </p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          disabled={isLoading}
        >
          <Trash2 className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Options */}
      {item.options.length > 0 && (
        <div className="space-y-1">
          {item.options.map((option) => (
            <div key={option.id} className="text-xs text-gray-600">
              <span className="font-medium">{option.name}:</span> {String(option.value)}
              {option.price > 0 && (
                <span className="ml-1 text-green-600">
                  +{option.price.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modifications */}
      {item.modifications.length > 0 && (
        <div className="space-y-1">
          {item.modifications.map((modification) => (
            <div key={modification.id} className="text-xs text-gray-600">
              <span className="font-medium">{modification.name}:</span> {String(modification.value)}
              {(modification.priceMultiplier !== 1 || modification.priceAdd > 0) && (
                <span className="ml-1 text-orange-600">
                  {modification.priceMultiplier !== 1 && `×${modification.priceMultiplier}`}
                  {modification.priceAdd > 0 && `+${modification.priceAdd.toLocaleString('ru-RU')} ₽`}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quantity and Price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            disabled={isLoading}
          >
            <Minus className="h-4 w-4 text-gray-500" />
          </button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        
        <div className="text-right">
          <div className="font-semibold text-gray-900">
            {item.total.toLocaleString('ru-RU')} ₽
          </div>
          {item.quantity > 1 && (
            <div className="text-xs text-gray-500">
              {item.basePrice.toLocaleString('ru-RU')} ₽ за шт.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
