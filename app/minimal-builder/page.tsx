'use client';

import React, { useState } from 'react';

export default function MinimalBuilderPage() {
  const [elements, setElements] = useState<any[]>([]);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">Минимальный конструктор</h1>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 p-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 min-h-96">
            <p className="text-gray-500 text-center">Canvas (Холст)</p>
            <p className="text-gray-400 text-sm text-center mt-2">
              Элементов: {elements.length}
            </p>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">Свойства</h2>
          <p className="text-gray-500 text-sm">Выберите элемент для редактирования</p>
        </div>
      </div>
    </div>
  );
}
