'use client';

import React from 'react';

export default function TestBuilderPage() {
  return (
    <div className="h-screen w-full bg-gray-100">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          ✅ Тестовая страница конструктора работает!
        </h1>
        <p className="text-gray-600 mb-4">
          Если вы видите эту страницу, значит Next.js работает правильно.
        </p>
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Статус:</h2>
          <ul className="text-blue-700 space-y-1">
            <li>✅ Next.js запущен</li>
            <li>✅ Маршрутизация работает</li>
            <li>✅ React компоненты рендерятся</li>
            <li>✅ Tailwind CSS работает</li>
            <li>✅ Страница конструктора доступна</li>
          </ul>
        </div>
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Следующий шаг:</h3>
          <p className="text-yellow-700">
            Теперь попробуйте открыть основную страницу конструктора:
          </p>
          <a 
            href="/professional-builder" 
            className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Открыть Professional Builder
          </a>
        </div>
      </div>
    </div>
  );
}
