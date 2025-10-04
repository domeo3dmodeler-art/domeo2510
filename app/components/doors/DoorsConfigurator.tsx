'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Input, Alert } from '@/components/ui';
import { ShoppingCart, Package, Settings, Calculator } from 'lucide-react';
import DiscountManager from '../cart/DiscountManager';

interface DoorProduct {
  id: string;
  model: string;
  modelPhoto?: string;
  style: string;
  finish: string;
  color: string;
  type: string;
  width: number;
  height: number;
  rrc_price: number;
  sku_1c: string;
  supplier: string;
  collection: string;
  supplier_item_name: string;
  supplier_color_finish: string;
  price_opt: number;
}

interface HardwareKit {
  id: string;
  name: string;
  group: number;
  price_rrc: number;
}

interface Handle {
  id: string;
  name: string;
  supplier_name: string;
  supplier_sku: string;
  price_opt: number;
  price_rrc: number;
  price_group_multiplier: number;
}

interface CartItem {
  id: string;
  product: DoorProduct;
  quantity: number;
  selectedKit?: HardwareKit;
  selectedHandle?: Handle;
  calculated_price: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

interface DoorsConfiguratorProps {
  categoryId?: string;
}

export default function DoorsConfigurator({ categoryId = 'doors' }: DoorsConfiguratorProps) {
  const [products, setProducts] = useState<DoorProduct[]>([]);
  const [hardwareKits, setHardwareKits] = useState<HardwareKit[]>([]);
  const [handles, setHandles] = useState<Handle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние конфигуратора
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedFinish, setSelectedFinish] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedWidth, setSelectedWidth] = useState<number>(800);
  const [selectedHeight, setSelectedHeight] = useState<number>(2000);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [selectedHandle, setSelectedHandle] = useState<string>('');
  
  // Корзина
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showDiscountManager, setShowDiscountManager] = useState(false);

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем продукты из реальной БД
      const productsResponse = await fetch(`/api/catalog/products?categoryId=${categoryId}`);
      const productsData = await productsResponse.json();
      
      if (productsData.success) {
        setProducts(productsData.products || []);
      } else {
        throw new Error('Ошибка загрузки товаров');
      }

      // Загружаем комплекты фурнитуры (пока используем статические данные)
      setHardwareKits([
        { id: "KIT_STD", name: "Базовый комплект", group: 1, price_rrc: 5000 },
        { id: "KIT_SOFT", name: "SoftClose", group: 2, price_rrc: 2400 },
      ]);

      // Загружаем ручки (пока используем статические данные)
      setHandles([
        {
          id: "HNDL_PRO",
          name: "Pro",
          supplier_name: "HandleCo",
          supplier_sku: "H-PRO",
          price_opt: 900,
          price_rrc: 1200,
          price_group_multiplier: 1.15,
        },
        {
          id: "HNDL_SIL",
          name: "Silver",
          supplier_name: "HandleCo",
          supplier_sku: "H-SIL",
          price_opt: 1100,
          price_rrc: 1400,
          price_group_multiplier: 1.15,
        },
      ]);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка загрузки данных. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  };

  // Получаем уникальные значения для фильтров
  const styles = [...new Set(products.map(p => p.style))].sort();
  const models = [...new Set(
    products
      .filter(p => !selectedStyle || p.style === selectedStyle)
      .map(p => p.model)
  )].sort();
  const finishes = [...new Set(
    products
      .filter(p => {
        if (selectedStyle && p.style !== selectedStyle) return false;
        if (selectedModel && p.model !== selectedModel) return false;
        return true;
      })
      .map(p => p.finish)
  )].sort();
  const colors = [...new Set(
    products
      .filter(p => {
        if (selectedStyle && p.style !== selectedStyle) return false;
        if (selectedModel && p.model !== selectedModel) return false;
        if (selectedFinish && p.finish !== selectedFinish) return false;
        return true;
      })
      .map(p => p.color)
  )].sort();
  const types = [...new Set(products.map(p => p.type))].sort();
  const widths = [...new Set(products.map(p => p.width))].sort();
  const heights = [...new Set(products.map(p => p.height))].sort();

  // Находим выбранный продукт
  const selectedProduct = products.find(p => 
    p.style === selectedStyle &&
    p.model === selectedModel &&
    p.finish === selectedFinish &&
    p.color === selectedColor &&
    p.type === selectedType &&
    p.width === selectedWidth &&
    p.height === selectedHeight
  );

  // Вычисляем итоговую цену
  const calculateTotalPrice = () => {
    if (!selectedProduct) return 0;
    
    let total = selectedProduct.rrc_price;
    
    if (selectedKit) {
      const kit = hardwareKits.find(k => k.id === selectedKit);
      if (kit) total += kit.price_rrc;
    }
    
    if (selectedHandle) {
      const handle = handles.find(h => h.id === selectedHandle);
      if (handle) total += handle.price_rrc;
    }
    
    return total;
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const cartItem: CartItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      product: selectedProduct,
      quantity: 1,
      selectedKit: selectedKit ? hardwareKits.find(k => k.id === selectedKit) : undefined,
      selectedHandle: selectedHandle ? handles.find(h => h.id === selectedHandle) : undefined,
      calculated_price: calculateTotalPrice()
    };

    setCart(prev => [...prev, cartItem]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => {
      let itemPrice = item.calculated_price;
      
      // Применяем скидку
      if (item.discount && item.discountType) {
        if (item.discountType === 'percentage') {
          itemPrice = itemPrice * (1 - item.discount / 100);
        } else {
          itemPrice = Math.max(0, itemPrice - item.discount);
        }
      }
      
      return sum + (itemPrice * item.quantity);
    }, 0);
  };

  const getCartTotalWithoutDiscounts = () => {
    return cart.reduce((sum, item) => sum + (item.calculated_price * item.quantity), 0);
  };

  const handleApplyDiscount = (itemId: string, discount: number, discountType: 'percentage' | 'fixed') => {
    setCart(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, discount, discountType }
        : item
    ));
  };

  const handleRemoveDiscount = (itemId: string) => {
    setCart(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, discount: undefined, discountType: undefined }
        : item
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка конфигуратора дверей...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert type="error" message={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основная панель конфигуратора */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Package className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Конфигуратор дверей</h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Стиль */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Стиль</label>
                  <Select
                    value={selectedStyle}
                    onValueChange={setSelectedStyle}
                    placeholder="Выберите стиль"
                  >
                    {styles.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </Select>
                </div>

                {/* Модель */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Модель</label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    placeholder="Выберите модель"
                    disabled={!selectedStyle}
                  >
                    {models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </Select>
                </div>

                {/* Отделка */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Отделка</label>
                  <Select
                    value={selectedFinish}
                    onValueChange={setSelectedFinish}
                    placeholder="Выберите отделку"
                    disabled={!selectedModel}
                  >
                    {finishes.map(finish => (
                      <option key={finish} value={finish}>{finish}</option>
                    ))}
                  </Select>
                </div>

                {/* Цвет */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
                  <Select
                    value={selectedColor}
                    onValueChange={setSelectedColor}
                    placeholder="Выберите цвет"
                    disabled={!selectedFinish}
                  >
                    {colors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </Select>
                </div>

                {/* Тип */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Тип</label>
                  <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                    placeholder="Выберите тип"
                  >
                    {types.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </div>

                {/* Размеры */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ширина (мм)</label>
                    <Select
                      value={selectedWidth.toString()}
                      onValueChange={(value) => setSelectedWidth(parseInt(value))}
                    >
                      {widths.map(width => (
                        <option key={width} value={width.toString()}>{width}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Высота (мм)</label>
                    <Select
                      value={selectedHeight.toString()}
                      onValueChange={(value) => setSelectedHeight(parseInt(value))}
                    >
                      {heights.map(height => (
                        <option key={height} value={height.toString()}>{height}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Дополнительные опции */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Дополнительные опции</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Комплект фурнитуры */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Комплект фурнитуры</label>
                  <Select
                    value={selectedKit}
                    onValueChange={setSelectedKit}
                    placeholder="Выберите комплект"
                  >
                    {hardwareKits.map(kit => (
                      <option key={kit.id} value={kit.id}>
                        {kit.name} (+{kit.price_rrc.toLocaleString()} ₽)
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Ручка */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ручка</label>
                  <Select
                    value={selectedHandle}
                    onValueChange={setSelectedHandle}
                    placeholder="Выберите ручку"
                  >
                    {handles.map(handle => (
                      <option key={handle.id} value={handle.id}>
                        {handle.name} (+{handle.price_rrc.toLocaleString()} ₽)
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </Card>

            {/* Кнопка добавления в корзину */}
            {selectedProduct && (
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Итого: {calculateTotalPrice().toLocaleString()} ₽</h3>
                    <p className="text-sm text-gray-600">
                      {selectedProduct.model} • {selectedWidth}×{selectedHeight}мм
                    </p>
                  </div>
                  <Button
                    onClick={addToCart}
                    className="flex items-center space-x-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Добавить в корзину</span>
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Панель корзины */}
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Корзина</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {cart.length}
                  </span>
                </div>
                {cart.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDiscountManager(!showDiscountManager)}
                    className="flex items-center space-x-1"
                  >
                    <Calculator className="h-4 w-4" />
                    <span>Скидки</span>
                  </Button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Корзина пуста</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-gray-900">{item.product.model}</h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-2">
                        {item.product.width}×{item.product.height}мм • {item.product.color}
                      </p>
                      
                      {item.selectedKit && (
                        <p className="text-xs text-gray-600 mb-1">+ {item.selectedKit.name}</p>
                      )}
                      
                      {item.selectedHandle && (
                        <p className="text-xs text-gray-600 mb-1">+ {item.selectedHandle.name}</p>
                      )}
                      
                      {item.discount && (
                        <div className="mb-2 p-2 bg-green-100 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-green-800">
                              Скидка: {item.discountType === 'percentage' ? `${item.discount}%` : `${item.discount} ₽`}
                            </span>
                            <span className="text-green-700 font-medium">
                              -{((item.calculated_price * item.quantity) - (getCartTotal() / cart.length)).toLocaleString()} ₽
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          {item.discount && (
                            <div className="text-xs text-gray-500 line-through">
                              {(item.calculated_price * item.quantity).toLocaleString()} ₽
                            </div>
                          )}
                          <span className="font-medium text-sm">
                            {(getCartTotal() / cart.length).toLocaleString()} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-3">
                    {getCartTotalWithoutDiscounts() !== getCartTotal() && (
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>Сумма без скидок:</span>
                        <span>{getCartTotalWithoutDiscounts().toLocaleString()} ₽</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between font-semibold">
                      <span>Итого:</span>
                      <span>{getCartTotal().toLocaleString()} ₽</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Менеджер скидок */}
            {showDiscountManager && cart.length > 0 && (
              <DiscountManager
                cartItems={cart.map(item => ({
                  id: item.id,
                  name: `${item.product.model} ${item.product.width}×${item.product.height}мм`,
                  price: item.calculated_price,
                  quantity: item.quantity,
                  subtotal: item.calculated_price * item.quantity
                }))}
                onApplyDiscount={handleApplyDiscount}
                onRemoveDiscount={handleRemoveDiscount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
