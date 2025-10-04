'use client';

import React, { useState } from 'react';
import { ConstructorElement } from './types';

interface ElementRendererProps {
  element: ConstructorElement;
  isSelected: boolean;
  viewport: 'desktop' | 'tablet' | 'mobile';
  onSelect: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
}

export default function ElementRenderer({
  element,
  isSelected,
  viewport,
  onSelect,
  onMove,
  onResize
}: ElementRendererProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const currentSettings = element.responsive[viewport];
  const currentSize = viewport === 'desktop' ? element.size : currentSettings;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - element.position.x,
        y: e.clientY - element.position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      onMove(newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: currentSize.width,
      height: currentSize.height
    });
  };

  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (isResizing) {
      const newSize = {
        width: Math.max(50, resizeStart.width + (e.clientX - resizeStart.x)),
        height: Math.max(50, resizeStart.height + (e.clientY - resizeStart.y))
      };
      onResize(newSize);
    }
  };

  React.useEffect(() => {
    if (isDragging || isResizing) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const newPosition = {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
          };
          onMove(newPosition);
        }
        
        if (isResizing) {
          const newSize = {
            width: Math.max(50, resizeStart.width + (e.clientX - resizeStart.x)),
            height: Math.max(50, resizeStart.height + (e.clientY - resizeStart.y))
          };
          onResize(newSize);
        }
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, onMove, onResize]);

  const renderElementContent = () => {
    switch (element.component) {
      case 'container':
        return (
          <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
            <span className="text-gray-500">Контейнер</span>
          </div>
        );

      case 'text':
        return (
          <div className="w-full h-full p-2">
            <span className="text-sm">{element.props.content || 'Введите текст...'}</span>
          </div>
        );

      case 'image':
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">🖼️ Изображение</span>
          </div>
        );

      case 'button':
        return (
          <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {element.props.text || 'Кнопка'}
          </button>
        );

      case 'productGrid':
        return (
          <div className="w-full h-full bg-gray-50 p-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border rounded p-2">
                  <div className="w-full h-20 bg-gray-200 mb-2"></div>
                  <div className="text-xs">Товар {i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'productFilter':
        return (
          <div className="w-full h-full bg-gray-50 p-4">
            <div className="space-y-3">
              <div className="bg-white p-2 rounded border">
                <label className="text-sm font-medium">Цена</label>
                <input type="range" className="w-full mt-1" />
              </div>
              <div className="bg-white p-2 rounded border">
                <label className="text-sm font-medium">Бренд</label>
                <select className="w-full mt-1 text-sm">
                  <option>Все бренды</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'productCart':
        return (
          <div className="w-full h-full bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Корзина</h3>
              <span className="text-sm text-gray-500">2 товара</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="text-sm">Товар 1</div>
                  <div className="text-xs text-gray-500">1,500 ₽</div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm font-medium">
                <span>Итого:</span>
                <span>3,000 ₽</span>
              </div>
            </div>
          </div>
        );

      case 'priceCalculator':
        return (
          <div className="w-full h-full bg-gray-50 p-4">
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border">
                <div className="text-sm font-medium mb-2">Расчет цены</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Базовая цена:</span>
                    <span>1,500 ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Дополнительно:</span>
                    <span>500 ₽</span>
                  </div>
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Итого:</span>
                    <span>2,000 ₽</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">{element.component}</span>
          </div>
        );
    }
  };

  return (
    <div
      className={`absolute cursor-move select-none ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: currentSize.width,
        height: currentSize.height,
        zIndex: element.zIndex
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Контент элемента */}
      <div className="w-full h-full relative">
        {renderElementContent()}
        
        {/* Handle для изменения размера */}
        {isSelected && (
          <div
            className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
            onMouseDown={handleResizeMouseDown}
            onMouseMove={handleResizeMouseMove}
          />
        )}
        
        {/* Индикатор выбранного элемента */}
        {isSelected && (
          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 border-2 border-blue-500 pointer-events-none" />
        )}
      </div>
    </div>
  );
}

