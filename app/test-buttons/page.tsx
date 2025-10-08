'use client';

import React from 'react';

export default function TestButtons() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тестовая страница</h1>
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Синяя кнопка
        </button>
        <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          🔴 Красная кнопка
        </button>
        <button className="px-4 py-2 bg-yellow-600 text-black rounded hover:bg-yellow-700">
          🟡 Желтая кнопка
        </button>
      </div>
    </div>
  );
}
