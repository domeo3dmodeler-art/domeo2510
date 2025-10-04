'use client';

import React, { useState, useEffect } from 'react';
import { BaseElement } from '../types';

interface PriceOption {
  id: string;
  name: string;
  price: number;
  type: 'base' | 'addon' | 'discount';
  required?: boolean;
  selected?: boolean;
  description?: string;
}

interface PriceCalculatorProps {
  element: BaseElement;
  onUpdate: (updates: Partial<BaseElement>) => void;
}

export function PriceCalculator({ element, onUpdate }: PriceCalculatorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, PriceOption>>({});
  const [basePrice, setBasePrice] = useState(15000);
  const [totalPrice, setTotalPrice] = useState(15000);
  const [discount, setDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(15000);

  // Опции для калькулятора
  const priceOptions: PriceOption[] = [
    {
      id: 'base_door',
      name: 'Базовая дверь',
      price: 15000,
      type: 'base',
      required: true,
      description: 'Стандартная межкомнатная дверь'
    },
    {
      id: 'material_upgrade',
      name: 'Массив дерева',
      price: 8000,
      type: 'addon',
      description: 'Улучшенный материал'
    },
    {
      id: 'glass_insert',
      name: 'Стеклянная вставка',
      price: 3000,
      type: 'addon',
      description: 'Декоративная стеклянная вставка'
    },
    {
      id: 'hardware_set',
      name: 'Комплект фурнитуры',
      price: 4500,
      type: 'addon',
      description: 'Ручки, петли, замок'
    },
    {
      id: 'sound_insulation',
      name: 'Звукоизоляция',
      price: 2500,
      type: 'addon',
      description: 'Улучшенная звукоизоляция'
    },
    {
      id: 'custom_size',
      name: 'Нестандартный размер',
      price: 2000,
      type: 'addon',
      description: 'Изготовление под размер'
    },
    {
      id: 'express_delivery',
      name: 'Экспресс доставка',
      price: 1500,
      type: 'addon',
      description: 'Доставка в течение 3 дней'
    },
    {
      id: 'bulk_discount',
      name: 'Оптовая скидка',
      price: -2000,
      type: 'discount',
      description: 'При заказе от 3 штук'
    }
  ];

  // Инициализация базовой опции
  useEffect(() => {
    const baseOption = priceOptions.find(opt => opt.type === 'base');
    if (baseOption) {
      setSelectedOptions({ [baseOption.id]: baseOption });
      setBasePrice(baseOption.price);
    }
  }, []);

  // Пересчет цены при изменении опций
  useEffect(() => {
    let total = 0;
    let discountAmount = 0;

    Object.values(selectedOptions).forEach(option => {
      if (option.type === 'discount') {
        discountAmount += Math.abs(option.price);
      } else {
        total += option.price;
      }
    });

    setTotalPrice(total);
    setDiscount(discountAmount);
    setFinalPrice(Math.max(0, total - discountAmount));
  }, [selectedOptions]);

  const toggleOption = (option: PriceOption) => {
    setSelectedOptions(prev => {
      const newOptions = { ...prev };
      
      if (option.type === 'base') {
        // Базовая опция всегда должна быть выбрана
        return newOptions;
      }
      
      if (newOptions[option.id]) {
        delete newOptions[option.id];
      } else {
        newOptions[option.id] = { ...option, selected: true };
      }
      
      return newOptions;
    });
  };

  const resetCalculator = () => {
    const baseOption = priceOptions.find(opt => opt.type === 'base');
    if (baseOption) {
      setSelectedOptions({ [baseOption.id]: baseOption });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price);
  };

  return (
    <div className="w-full h-full p-4">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {/* Компактный заголовок */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {element.props.title || 'Калькулятор цены'}
          </h2>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
          {/* Левая колонка - Опции */}
          <div className="lg:col-span-2 overflow-y-auto">
            <div className="space-y-4">
              {/* Базовая цена */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Базовая комплектация</h3>
                <div className="space-y-3">
                  {priceOptions.filter(opt => opt.type === 'base').map(option => (
                    <label key={option.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled={true}
                          className="mr-2 text-blue-600"
                        />
                        <div>
                          <div className="font-medium text-sm text-blue-900">{option.name}</div>
                          <div className="text-xs text-blue-700">{option.description}</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-blue-600">
                        {formatPrice(option.price)} ₽
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Дополнительные опции */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Дополнительные опции</h3>
                <div className="grid grid-cols-1 gap-2">
                  {priceOptions.filter(opt => opt.type === 'addon').map(option => (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-all ${
                        selectedOptions[option.id]
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!!selectedOptions[option.id]}
                          onChange={() => toggleOption(option)}
                          className="mr-2"
                        />
                        <div>
                          <div className="font-medium text-sm">{option.name}</div>
                          <div className="text-xs text-gray-600">{option.description}</div>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${
                        selectedOptions[option.id] ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        +{formatPrice(option.price)} ₽
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Скидки */}
              {priceOptions.filter(opt => opt.type === 'discount').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Скидки</h3>
                  <div className="space-y-3">
                    {priceOptions.filter(opt => opt.type === 'discount').map(option => (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedOptions[option.id]
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!!selectedOptions[option.id]}
                            onChange={() => toggleOption(option)}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium">{option.name}</div>
                            <div className="text-sm text-gray-600">{option.description}</div>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          selectedOptions[option.id] ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {formatPrice(option.price)} ₽
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Правая колонка - Итоговая цена */}
          <div className="lg:col-span-1">
            <div className="h-full">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Итоговая цена</h3>
                
                {/* Базовая цена */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Базовая цена:</span>
                  <span className="font-medium text-sm">{formatPrice(basePrice)} ₽</span>
                </div>

                {/* Дополнительные опции */}
                {Object.values(selectedOptions).filter(opt => opt.type === 'addon').length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-600 mb-2">Дополнительные опции:</div>
                    {Object.values(selectedOptions).filter(opt => opt.type === 'addon').map(option => (
                      <div key={option.id} className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-600">{option.name}:</span>
                        <span className="font-medium text-green-600">+{formatPrice(option.price)} ₽</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Скидки */}
                {Object.values(selectedOptions).filter(opt => opt.type === 'discount').length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm text-gray-600 mb-2">Скидки:</div>
                    {Object.values(selectedOptions).filter(opt => opt.type === 'discount').map(option => (
                      <div key={option.id} className="flex justify-between items-center text-sm mb-1">
                        <span className="text-gray-600">{option.name}:</span>
                        <span className="font-medium text-red-600">{formatPrice(option.price)} ₽</span>
                      </div>
                    ))}
                  </div>
                )}

                <hr className="my-4" />

                {/* Итого */}
                <div className="flex justify-between items-center mb-4 p-3 bg-white rounded border">
                  <span className="text-sm font-semibold text-gray-900">Итого:</span>
                  <span className="text-xl font-bold text-blue-600">{formatPrice(finalPrice)} ₽</span>
                </div>

                {/* Кнопки действий */}
                <div className="space-y-2 mt-auto">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm">
                    Добавить в корзину
                  </button>
                  <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm">
                    Сохранить
                  </button>
                  <button
                    onClick={resetCalculator}
                    className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-xs"
                  >
                    Сбросить
                  </button>
                </div>

                {/* Дополнительная информация */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• Цена указана без учета доставки</div>
                    <div>• Возможны индивидуальные скидки</div>
                    <div>• Срок изготовления: 7-14 дней</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}