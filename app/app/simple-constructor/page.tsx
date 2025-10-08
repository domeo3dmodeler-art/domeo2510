'use client';

import React, { useState } from 'react';

export default function SimpleConstructorPage() {
  const [style, setStyle] = useState('modern');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(2000);
  const [finish, setFinish] = useState('paint');

  const styles = [
    { id: 'modern', name: 'Современная', price: 15000 },
    { id: 'classic', name: 'Классическая', price: 18000 },
    { id: 'neoclassic', name: 'Неоклассика', price: 17000 },
    { id: 'hidden', name: 'Скрытая', price: 25000 },
  ];

  const finishes = [
    { id: 'paint', name: 'Эмаль', multiplier: 1.0 },
    { id: 'veneer', name: 'Шпон', multiplier: 1.3 },
    { id: 'glass', name: 'Стекло', multiplier: 1.4 },
    { id: 'nanotex', name: 'Нанотекс', multiplier: 1.1 },
  ];

  const calculatePrice = () => {
    const selectedStyle = styles.find(s => s.id === style);
    const selectedFinish = finishes.find(f => f.id === finish);
    if (!selectedStyle || !selectedFinish) return 0;
    
    const basePrice = selectedStyle.price;
    const finishMultiplier = selectedFinish.multiplier;
    const areaMultiplier = (width * height) / (800 * 2000);
    
    return Math.round(basePrice * finishMultiplier * areaMultiplier);
  };

  const addToCart = () => {
    alert('Дверь добавлена в корзину!');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
          DOMEO Конструктор
        </h1>
        <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>
          Простой и быстрый конфигуратор товаров
        </p>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
            Конфигуратор дверей DOMEO
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            {/* Левая панель */}
            <div>
              {/* Стиль */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>1. Выберите стиль</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {styles.map((styleOption) => (
              <button
                      key={styleOption.id}
                      onClick={() => setStyle(styleOption.id)}
                      style={{
                        padding: '15px',
                        border: style === styleOption.id ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: style === styleOption.id ? '#eff6ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ width: '100%', height: '60px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                        🚪
                      </div>
                      <h4 style={{ fontWeight: '500', fontSize: '14px', margin: '0 0 4px 0' }}>{styleOption.name}</h4>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>от {styleOption.price.toLocaleString()} ₽</p>
              </button>
                  ))}
            </div>
              </div>

              {/* Размеры */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>2. Размеры</h3>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Ширина: {width} мм
                  </label>
                  <input
                    type="range"
                    min="600"
                    max="1200"
                    step="50"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value))}
                    style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Высота: {height} мм
                  </label>
                  <input
                    type="range"
                    min="1800"
                    max="2400"
                    step="50"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value))}
                    style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', outline: 'none' }}
                  />
          </div>
        </div>

              {/* Отделка */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>3. Отделка</h3>
                <select
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
                >
                  {finishes.map((finishOption) => (
                    <option key={finishOption.id} value={finishOption.id}>
                      {finishOption.name}
                    </option>
                  ))}
                </select>
                </div>
                </div>

            {/* Правая панель */}
            <div>
              {/* Предпросмотр */}
              <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Предпросмотр</h3>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '2px dashed #d1d5db', textAlign: 'center' }}>
                  <div style={{ width: '120px', height: '150px', margin: '0 auto 15px auto', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                    🚪
              </div>
                  <h4 style={{ fontWeight: '500', margin: '0 0 8px 0' }}>{styles.find(s => s.id === style)?.name}</h4>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>
                    {width} × {height} мм
                  </p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{finishes.find(f => f.id === finish)?.name}</p>
          </div>
        </div>

              {/* Цена */}
              <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Итоговая цена</h3>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '8px' }}>
                    {calculatePrice().toLocaleString()} ₽
                  </div>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 15px 0' }}>
                    Включает установку и гарантию
                  </p>
          <button
                    onClick={addToCart}
                    style={{
                      width: '100%',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                  >
                    Добавить в корзину
          </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', margin: 0 }}>© 2024 DOMEO. Простой конструктор товаров</p>
          </div>
    </div>
  );
}