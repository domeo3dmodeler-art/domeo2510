'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  name: string;
  style: string;
  finish: string;
  dimensions: string;
  price: number;
  quantity: number;
}

export function SimpleCart() {
  const [items, setItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Дверь DOMEO',
      style: 'Современная',
      finish: 'Эмаль',
      dimensions: '800×2000 мм',
      price: 15000,
      quantity: 1,
    },
    {
      id: '2',
      name: 'Дверь DOMEO',
      style: 'Классическая',
      finish: 'Шпон',
      dimensions: '900×2100 мм',
      price: 23400,
      quantity: 1,
    },
  ]);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity: newQuantity } : item
    ));
    toast.success('Количество обновлено');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('Товар удален из корзины');
  };

  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const checkout = () => {
    toast.success('Переход к оформлению заказа...');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg"
      >
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Корзина покупок</h1>
          <p className="text-gray-600 mt-1">Проверьте выбранные товары</p>
        </div>

        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Корзина пуста</h3>
              <p className="text-gray-500">Добавьте товары из конфигуратора</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🚪</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">
                        {item.style} • {item.finish} • {item.dimensions}
                      </p>
                      <p className="text-lg font-semibold text-blue-600">
                        {item.price.toLocaleString()} ₽
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-200"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border-t bg-gray-50"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-gray-900">Итого:</span>
              <span className="text-2xl font-bold text-blue-600">
                {totalPrice.toLocaleString()} ₽
              </span>
            </div>
            
            <div className="flex space-x-4">
              <button className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors">
                Продолжить покупки
              </button>
              <button
                onClick={checkout}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Оформить заказ
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}