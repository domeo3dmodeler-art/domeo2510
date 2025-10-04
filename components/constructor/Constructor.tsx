'use client';

import React, { useState } from 'react';
import { BlockType } from './types';
import { useConstructor } from './hooks/useConstructor';
import ElementsPanel from './ElementsPanel';
import CanvasArea from './CanvasArea';
import PropertiesPanel from './PropertiesPanel';

export default function Constructor() {
  const {
    state,
    selectedElement,
    addElement,
    updateElement,
    removeElement,
    selectElement,
    moveElement,
    resizeElement,
    setViewport,
    setZoom,
    toggleGrid,
    toggleSnapToGrid
  } = useConstructor();

  const handleDragStart = (blockType: BlockType) => {
    console.log('Drag started:', blockType);
  };

  const handleDrop = (position: { x: number; y: number }, blockType: string) => {
    addElement(blockType as BlockType, position);
  };

  const handleElementSelect = (id: string) => {
    selectElement(id);
  };

  const handleElementMove = (id: string, position: { x: number; y: number }) => {
    moveElement(id, position);
  };

  const handleElementResize = (id: string, size: { width: number; height: number }) => {
    resizeElement(id, size);
  };

  const handleElementUpdate = (updates: any) => {
    if (selectedElement) {
      updateElement(selectedElement.id, updates);
    }
  };

  const handleViewportChange = (viewport: 'desktop' | 'tablet' | 'mobile') => {
    setViewport(viewport);
  };

  const handleZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              No-Code Конструктор
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Создавайте конфигураторы товаров без программирования
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Инструменты */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleGrid}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  state.grid
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Сетка
              </button>
              <button
                onClick={toggleSnapToGrid}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  state.snapToGrid
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Привязка
              </button>
            </div>

            {/* Сохранение */}
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300">
                Предпросмотр
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600">
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Основная область */}
      <div className="flex-1 flex overflow-hidden">
        {/* Панель элементов */}
        <ElementsPanel onDragStart={handleDragStart} />

        {/* Рабочая область */}
        <div className="flex-1 flex flex-col">
          <CanvasArea
            elements={state.elements}
            selectedElement={state.selectedElement}
            viewport={state.viewport}
            zoom={state.zoom}
            grid={state.grid}
            onElementSelect={handleElementSelect}
            onElementMove={handleElementMove}
            onElementResize={handleElementResize}
            onDrop={handleDrop}
          />
        </div>

        {/* Панель свойств */}
        <PropertiesPanel
          selectedElement={selectedElement}
          viewport={state.viewport}
          onUpdate={handleElementUpdate}
        />
      </div>

      {/* Статусная строка */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>Элементов: {state.elements.length}</span>
            <span>Выбран: {selectedElement?.component || 'Нет'}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Viewport: {state.viewport}</span>
            <span>Zoom: {Math.round(state.zoom * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

