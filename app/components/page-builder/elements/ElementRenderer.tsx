'use client';

import React, { useState, useRef } from 'react';
import { BaseElement, ElementRendererProps, Size } from '../types';
import { SelectionOverlay } from './SelectionOverlay';
import { shouldShowTechnicalInfo } from '../../../lib/display-mode';

// Основные компоненты
import { Text } from './Text';
import { Heading } from './Heading';
import { ProductCard } from './ProductCard';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { Input } from './Input';
import { Select } from './Select';
import { Checkbox } from './Checkbox';
import { Radio } from './Radio';
import { ProductFilter } from './ProductFilter';
import { PropertyFilter } from './PropertyFilter';
import { FilteredProducts } from './FilteredProducts';

interface ExtendedElementRendererProps extends ElementRendererProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onResize: (newSize: Size) => void;
  onConnectionData?: (sourceElementId: string, data: any) => void;
  allElements?: BaseElement[];
  globalFilters?: Record<string, any>;
}

export function ElementRenderer({
  element,
  isSelected,
  isMultiSelected,
  zoom,
  onSelect,
  onMultiSelect,
  onUpdate,
  onDelete,
  onMouseDown,
  onResize,
  onConnectionData,
  allElements = [],
  globalFilters = {}
}: ExtendedElementRendererProps) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMouseDown(e);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.size.width,
      height: element.size.height
    });
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing || !resizeStart) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    const newWidth = Math.max(100, resizeStart.width + deltaX);
    const newHeight = Math.max(60, resizeStart.height + deltaY);
    
    onResize({ width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeStart(null);
  };

  React.useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => handleResizeMove(e as any);
      const handleMouseUp = () => handleResizeEnd();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeStart]);

  const renderContent = () => {
    switch (element.type) {
      // Основные элементы
      case 'text':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4">
            <Text
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      case 'heading':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4">
            <Heading
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      // Товарные компоненты
      case 'productCard':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <ProductCard
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      case 'productGrid':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <ProductGrid
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      case 'filteredProducts':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <FilteredProducts
              element={element}
              onUpdate={onUpdate}
              filters={globalFilters}
              onConnectionData={onConnectionData}
            />
          </div>
        );

      // Фильтры
      case 'productFilter':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <ProductFilter
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      case 'propertyFilter':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PropertyFilter
              element={element}
              onUpdate={onUpdate}
              onConnectionData={onConnectionData}
              onFilterChange={(propertyName, value) => {
                console.log('🔍 Filter changed:', { propertyName, value });
              }}
            />
          </div>
        );

      // Корзина
      case 'cart':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <Cart
              element={element}
              onUpdate={onUpdate}
              onConnectionData={onConnectionData}
            />
          </div>
        );

      // Формы
      case 'input':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4">
            <Input
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      case 'select':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4">
            <Select
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      case 'checkbox':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4">
            <Checkbox
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      case 'radio':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4">
            <Radio
              element={element}
              onUpdate={onUpdate}
            />
          </div>
        );

      // Структурные элементы
      case 'section':
        return (
          <div className="w-full h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-2xl mb-2">📋</div>
              <div className="text-sm font-medium">Секция</div>
              <div className="text-xs">ID: {element.id}</div>
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="w-full h-full bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
            <div className="text-gray-400 text-sm">Отступ</div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-2xl mb-2">❓</div>
              <div className="text-sm font-medium">Неизвестный компонент</div>
              <div className="text-xs">Тип: {element.type}</div>
              <div className="text-xs">ID: {element.id}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      ref={resizeRef}
      className={`relative ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isMultiSelected ? 'ring-2 ring-green-500' : ''}`}
      style={{
        width: element.size.width,
        height: element.size.height,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left'
      }}
      onMouseDown={handleMouseDown}
    >
      {renderContent()}
      
      {/* Техническая информация */}
      {shouldShowTechnicalInfo() && (
        <div className="absolute -top-6 left-0 bg-black text-white text-xs px-2 py-1 rounded">
          {element.type} ({element.size.width}×{element.size.height})
        </div>
      )}

      {/* Overlay для выбора */}
      <SelectionOverlay
        isSelected={isSelected}
        isMultiSelected={isMultiSelected}
        onSelect={onSelect}
        onMultiSelect={onMultiSelect}
        onDelete={onDelete}
        onResizeStart={handleResizeStart}
        elementNumber={allElements.findIndex(el => el.id === element.id) + 1}
      />
    </div>
  );
}