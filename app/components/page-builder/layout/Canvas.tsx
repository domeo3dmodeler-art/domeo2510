'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CanvasProps, BaseElement, Position } from '../types';
import { ElementRenderer } from '../elements/ElementRenderer';
import { GridOverlay } from './GridOverlay';
import { Rulers } from './Rulers';

export function Canvas({
  page,
  selectedElementId,
  zoom,
  viewMode,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onAddElement
}: CanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Размеры canvas
  const canvasWidth = 1200;
  const canvasHeight = 800;

  // Обработчик начала перетаскивания
  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    // Проверяем, что не кликнули на resize handle или delete button
    const target = e.target as HTMLElement;
    if (target.dataset.resizeHandle || target.dataset.deleteButton) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const element = findElementById(page?.elements || [], elementId);
    if (!element) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Вычисляем offset от угла элемента до точки клика
    const offsetX = mouseX - element.position.x;
    const offsetY = mouseY - element.position.y;

    setIsDragging(true);
    setDraggedElementId(elementId);
    setDragOffset({ x: offsetX, y: offsetY });
    onSelectElement(elementId);
  }, [page, onSelectElement]);

  // Глобальные обработчики мыши
  useEffect(() => {
    if (typeof document === 'undefined' || !document.addEventListener) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !draggedElementId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Вычисляем новую позицию элемента
      const newX = mouseX - dragOffset.x;
      const newY = mouseY - dragOffset.y;

      // Применяем привязку к сетке
      const gridSize = 20;
      const snappedX = Math.round(newX / gridSize) * gridSize;
      const snappedY = Math.round(newY / gridSize) * gridSize;

      // Ограничиваем позицию в пределах canvas
      const element = findElementById(page?.elements || [], draggedElementId);
      if (!element) return;

      const constrainedX = Math.max(0, Math.min(snappedX, canvasWidth - element.size.width));
      const constrainedY = Math.max(0, Math.min(snappedY, canvasHeight - element.size.height));

      onUpdateElement(draggedElementId, {
        position: { x: constrainedX, y: constrainedY }
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDraggedElementId(null);
      setDragOffset({ x: 0, y: 0 });
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false });
    document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, draggedElementId, dragOffset, page, onUpdateElement, canvasWidth, canvasHeight]);

  // Обработчик клика по canvas
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Если кликнули не по элементу, снимаем выделение
    if (e.target === e.currentTarget) {
      onSelectElement(null);
    }
  }, [onSelectElement]);

  // Обработчики drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.type === 'component') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Конвертируем координаты с учетом масштаба
        const scaledX = x / (zoom / 100);
        const scaledY = y / (zoom / 100);
        
        // Применяем привязку к сетке
        const gridSize = 20;
        const snappedX = Math.round(scaledX / gridSize) * gridSize;
        const snappedY = Math.round(scaledY / gridSize) * gridSize;
        
        onAddElement(data.elementType, { x: snappedX, y: snappedY });
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [zoom, onAddElement]);

  // Обработчик изменения размера
  const handleResize = useCallback((elementId: string, newSize: { width: number; height: number }) => {
    onUpdateElement(elementId, { size: newSize });
  }, [onUpdateElement]);

  // Функция поиска элемента по ID
  const findElementById = (elements: BaseElement[], id: string): BaseElement | null => {
    for (const element of elements) {
      if (element.id === id) {
        return element;
      }
      if (element.type === 'container' && 'children' in element) {
        const found = findElementById(element.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Страница не выбрана</h3>
          <p className="text-gray-500">Выберите страницу для редактирования</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Canvas Header */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <h2 className="font-medium text-gray-900">{page.name}</h2>
          <span className="text-sm text-gray-500">
            {canvasWidth} × {canvasHeight}px
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Масштаб: {zoom}%
          </span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="relative mx-auto" style={{ width: canvasWidth, height: canvasHeight }}>
          {/* Rulers */}
          <Rulers 
            width={canvasWidth} 
            height={canvasHeight} 
            zoom={zoom / 100}
          />

          {/* Canvas Container */}
          <div
            ref={canvasRef}
            className="relative bg-white border border-gray-300 shadow-lg"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              marginTop: 24,
              marginLeft: 24
            }}
            onClick={handleCanvasClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Grid Overlay */}
            {viewMode === 'edit' && (
              <GridOverlay 
                width={canvasWidth} 
                height={canvasHeight} 
                gridSize={20}
              />
            )}

            {/* Page Background */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: page.settings.backgroundColor
              }}
            />

            {/* Elements */}
            {page.elements.map((element) => (
              <ElementRenderer
                key={element.id}
                element={element}
                isSelected={selectedElementId === element.id}
                zoom={zoom / 100}
                onSelect={() => onSelectElement(element.id)}
                onUpdate={(updates) => onUpdateElement(element.id, updates)}
                onDelete={() => onDeleteElement(element.id)}
                onMouseDown={(e) => handleMouseDown(e, element.id)}
                onResize={(newSize) => handleResize(element.id, newSize)}
              />
            ))}

            {/* Drop Zone Indicators */}
            {isDragging && (
              <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 bg-opacity-50 pointer-events-none" />
            )}
            
            {isDragOver && (
              <div className="absolute inset-0 border-2 border-dashed border-green-400 bg-green-50 bg-opacity-50 pointer-events-none flex items-center justify-center">
                <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="font-medium">Отпустите для добавления компонента</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
