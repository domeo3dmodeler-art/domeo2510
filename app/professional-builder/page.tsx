'use client';

import React, { useState } from 'react';
import { Toolbar } from '../components/page-builder/layout/Toolbar';
import { PropertyFilter } from '../components/page-builder/elements/PropertyFilter';

export default function ProfessionalBuilderPage() {
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const addElement = () => {
    const newElement = {
      id: `element-${Date.now()}`,
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 100 },
      props: { content: 'Новый элемент' }
    };
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addPropertyFilter = () => {
    console.log('🟢 PropertyFilter button clicked!');
    const newElement = {
      id: `property-filter-${Date.now()}`,
      type: 'PropertyFilter',
      position: { x: 200, y: 200 },
      size: { width: 400, height: 300 },
      props: {
        title: 'Фильтр свойств',
        propertyName: 'style',
        layout: 'vertical',
        showProductCards: true,
        columns: 3,
        displaySettings: {
          columns: 3,
          showProductCards: true,
          customColumns: true,
          autoSize: true,
          domeoStyle: true,
          compactMode: true,
          cardHeight: 60,
          cardWidth: 80,
          labelPosition: 'outside',
          imageStyle: {
            imageType: 'outline'
          },
          textStyle: {
            fontSize: 14,
            fontWeight: 'normal',
            textColor: '#333333'
          },
          individualImages: {}
        }
      }
    };
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <Toolbar
        zoom={zoom}
        viewMode={viewMode}
        pageWidth={1200}
        pageHeight={800}
        onZoomChange={setZoom}
        onViewModeChange={setViewMode}
        onPageSizeChange={() => {}}
        onSave={() => {}}
        onUndo={() => {}}
        onRedo={() => {}}
        canUndo={false}
        canRedo={false}
        showComponentsPanel={true}
        showPropertiesPanel={true}
        onToggleComponentsPanel={() => {}}
        onTogglePropertiesPanel={() => {}}
        onTogglePagesPanel={() => {}}
        showCatalogPanel={false}
        onToggleCatalogPanel={() => {}}
        showSavePanel={false}
        onToggleSavePanel={() => {}}
        showPagesPanel={false}
        onShowTemplates={() => {}}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 p-8">
          <div className="bg-white border border-gray-200 rounded-lg p-8 min-h-96 relative">
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-500">Canvas (Холст)</p>
              <div className="flex gap-2">
                <button 
                  onClick={addElement}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Добавить элемент
                </button>
                <button 
                  onClick={() => alert('Кнопка работает!')}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  🔴 ТЕСТ КНОПКИ
                </button>
              </div>
            </div>
            
            {/* Elements */}
            {elements.map(element => (
              <div
                key={element.id}
                className={`absolute border-2 cursor-pointer ${
                  selectedElementId === element.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-white'
                }`}
                style={{
                  left: element.position.x,
                  top: element.position.y,
                  width: element.size.width,
                  height: element.size.height
                }}
                onClick={() => setSelectedElementId(element.id)}
              >
                {element.type === 'PropertyFilter' ? (
                  <PropertyFilter
                    element={element}
                    onUpdate={(updates) => {
                      setElements(elements.map(el => 
                        el.id === element.id 
                          ? { ...el, ...updates }
                          : el
                      ));
                    }}
                    onFilterChange={(propertyName, value) => {
                      console.log('Filter changed:', propertyName, value);
                    }}
                    onConnectionData={(sourceElementId, data) => {
                      console.log('Connection data:', sourceElementId, data);
                    }}
                  />
                ) : (
                  <div className="p-2">
                    {element.props.content}
                  </div>
                )}
              </div>
            ))}
            
            <p className="text-gray-400 text-sm text-center mt-4">
              Элементов: {elements.length}
            </p>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">Свойства</h2>
          {selectedElement ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Выбран: {selectedElement.type} (ID: {selectedElement.id})
              </p>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Содержимое
                  </label>
                  <input
                    type="text"
                    value={selectedElement.props.content}
                    onChange={(e) => {
                      setElements(elements.map(el => 
                        el.id === selectedElementId 
                          ? { ...el, props: { ...el.props, content: e.target.value } }
                          : el
                      ));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    X: {selectedElement.position.x}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="800"
                    value={selectedElement.position.x}
                    onChange={(e) => {
                      setElements(elements.map(el => 
                        el.id === selectedElementId 
                          ? { ...el, position: { ...el.position, x: parseInt(e.target.value) } }
                          : el
                      ));
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Y: {selectedElement.position.y}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="600"
                    value={selectedElement.position.y}
                    onChange={(e) => {
                      setElements(elements.map(el => 
                        el.id === selectedElementId 
                          ? { ...el, position: { ...el.position, y: parseInt(e.target.value) } }
                          : el
                      ));
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Выберите элемент для редактирования</p>
          )}
        </div>
      </div>
    </div>
  );
}
