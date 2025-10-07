'use client';

import React, { useRef, useState } from 'react';
import { ConstructorElement } from './types';
import ElementRenderer from './ElementRenderer';

interface CanvasAreaProps {
  elements: ConstructorElement[];
  selectedElement: string | null;
  viewport: 'desktop' | 'tablet' | 'mobile';
  zoom: number;
  grid: boolean;
  onElementSelect: (id: string) => void;
  onElementMove: (id: string, position: { x: number; y: number }) => void;
  onElementResize: (id: string, size: { width: number; height: number }) => void;
  onDrop: (position: { x: number; y: number }, blockType: string) => void;
}

export default function CanvasArea({
  elements,
  selectedElement,
  viewport,
  zoom,
  grid,
  onElementSelect,
  onElementMove,
  onElementResize,
  onDrop
}: CanvasAreaProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'element') {
        onDrop({ x, y }, data.blockType);
      }
    } catch (error) {
      console.error('Error parsing drop data:', error);
    }
  };

  const getViewportSize = () => {
    switch (viewport) {
      case 'tablet': return { width: 768, height: 1024 };
      case 'mobile': return { width: 375, height: 667 };
      default: return { width: 1200, height: 800 };
    }
  };

  const viewportSize = getViewportSize();

  return (
    <div className="flex-1 bg-gray-100 overflow-hidden relative">
      {/* Панель инструментов */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewportChange('desktop')}
            className={`px-3 py-1 rounded text-sm ${
              viewport === 'desktop' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => onViewportChange('tablet')}
            className={`px-3 py-1 rounded text-sm ${
              viewport === 'tablet' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Tablet
          </button>
          <button
            onClick={() => onViewportChange('mobile')}
            className={`px-3 py-1 rounded text-sm ${
              viewport === 'mobile' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Mobile
          </button>
        </div>
      </div>

      {/* Zoom контролы */}
      <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onZoomChange(zoom - 0.25)}
            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm"
          >
            -
          </button>
          <span className="text-sm text-gray-700 min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(zoom + 0.25)}
            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm"
          >
            +
          </button>
        </div>
      </div>

      {/* Рабочая область */}
      <div className="w-full h-full flex items-center justify-center p-8">
        <div
          ref={canvasRef}
          className="bg-white shadow-2xl relative overflow-hidden"
          style={{
            width: viewportSize.width,
            height: viewportSize.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center'
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Grid overlay */}
          {grid && (
            <div className="absolute inset-0 pointer-events-none">
              <svg
                width="100%"
                height="100%"
                className="opacity-20"
              >
                <defs>
                  <pattern
                    id="grid"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          )}

          {/* Элементы */}
          {elements.map(element => (
            <ElementRenderer
              key={element.id}
              element={element}
              isSelected={selectedElement === element.id}
              viewport={viewport}
              onSelect={() => onElementSelect(element.id)}
              onMove={(position) => onElementMove(element.id, position)}
              onResize={(size) => onElementResize(element.id, size)}
            />
          ))}

          {/* Drop zone indicator */}
          {isDragging && (
            <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-50 bg-opacity-50 flex items-center justify-center">
              <div className="text-blue-500 text-lg font-medium">
                Отпустите элемент здесь
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Заглушки для функций (будут реализованы в родительском компоненте)
const onViewportChange = (viewport: string) => {
  console.log('Viewport changed:', viewport);
};

const onZoomChange = (zoom: number) => {
  console.log('Zoom changed:', zoom);
};

