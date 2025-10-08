'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import toast from 'react-hot-toast';

interface DoorConfig {
  style: string;
  size: { width: number; height: number };
  finish: string;
  price: number;
}

const doorStyles = [
  { id: 'modern', name: 'Современная', price: 15000, image: '/door-images/modern.svg' },
  { id: 'classic', name: 'Классическая', price: 18000, image: '/door-images/classic.svg' },
  { id: 'neoclassic', name: 'Неоклассика', price: 17000, image: '/door-images/neoclassic.svg' },
  { id: 'hidden', name: 'Скрытая', price: 25000, image: '/door-images/hidden.svg' },
];

const doorFinishes = [
  { id: 'paint', name: 'Эмаль', multiplier: 1.0 },
  { id: 'veneer', name: 'Шпон', multiplier: 1.3 },
  { id: 'glass', name: 'Стекло', multiplier: 1.4 },
  { id: 'nanotex', name: 'Нанотекс', multiplier: 1.1 },
];

export function SimpleDoorConfigurator() {
  const [config, setConfig] = useState<DoorConfig>({
    style: 'modern',
    size: { width: 800, height: 2000 },
    finish: 'paint',
    price: 15000,
  });

  const [selectedStyle, setSelectedStyle] = useState(doorStyles[0]);
  const [selectedFinish, setSelectedFinish] = useState(doorFinishes[0]);

  const calculatePrice = () => {
    const basePrice = selectedStyle.price;
    const finishMultiplier = selectedFinish.multiplier;
    const areaMultiplier = (config.size.width * config.size.height) / (800 * 2000);
    
    return Math.round(basePrice * finishMultiplier * areaMultiplier);
  };

  const handleStyleChange = (style: typeof doorStyles[0]) => {
    setSelectedStyle(style);
    setConfig(prev => ({ ...prev, style: style.id, price: calculatePrice() }));
    toast.success(`Выбран стиль: ${style.name}`);
  };

  const handleFinishChange = (finish: typeof doorFinishes[0]) => {
    setSelectedFinish(finish);
    setConfig(prev => ({ ...prev, finish: finish.id, price: calculatePrice() }));
    toast.success(`Выбрана отделка: ${finish.name}`);
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    setConfig(prev => ({
      ...prev,
      size: { ...prev.size, [dimension]: value },
      price: calculatePrice()
    }));
  };

  const addToCart = () => {
    toast.success('Дверь добавлена в корзину!', {
      icon: '🛒',
      duration: 3000,
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Конфигуратор дверей DOMEO
        </h1>
        <p className="text-gray-600">
          Выберите стиль, размер и отделку для вашей двери
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Левая панель - Выбор стиля */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-xl font-semibold mb-4">1. Выберите стиль</h2>
            <div className="grid grid-cols-2 gap-4">
              {doorStyles.map((style) => (
                <motion.button
                  key={style.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleStyleChange(style)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedStyle.id === style.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-full h-20 bg-gray-100 rounded mb-2 flex items-center justify-center">
                    <span className="text-2xl">🚪</span>
                  </div>
                  <h3 className="font-medium text-sm">{style.name}</h3>
                  <p className="text-xs text-gray-500">от {style.price.toLocaleString()} ₽</p>
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">2. Размеры</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ширина: {config.size.width} мм
                </label>
                <input
                  type="range"
                  min="600"
                  max="1200"
                  step="50"
                  value={config.size.width}
                  onChange={(e) => handleSizeChange('width', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Высота: {config.size.height} мм
                </label>
                <input
                  type="range"
                  min="1800"
                  max="2400"
                  step="50"
                  value={config.size.height}
                  onChange={(e) => handleSizeChange('height', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">3. Отделка</h2>
            <Listbox value={selectedFinish} onChange={handleFinishChange}>
              <div className="relative">
                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                  <span className="block truncate">{selectedFinish.name}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Transition
                  as={React.Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {doorFinishes.map((finish) => (
                      <Listbox.Option
                        key={finish.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                          }`
                        }
                        value={finish}
                      >
                        {({ selected }) => (
                          <>
                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                              {finish.name}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>
        </motion.div>

        {/* Правая панель - Предпросмотр и цена */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-6"
        >
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Предпросмотр</h2>
            <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="w-32 h-40 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-4xl">🚪</span>
                </div>
                <h3 className="font-medium">{selectedStyle.name}</h3>
                <p className="text-sm text-gray-500">
                  {config.size.width} × {config.size.height} мм
                </p>
                <p className="text-sm text-gray-500">{selectedFinish.name}</p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-blue-50 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Итоговая цена</h2>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {calculatePrice().toLocaleString()} ₽
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Включает установку и гарантию
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addToCart}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Добавить в корзину
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}