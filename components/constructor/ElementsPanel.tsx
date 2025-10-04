'use client';

import React from 'react';
import { BLOCK_CATEGORIES } from './blockDefinitions';
import { BlockType } from './types';

interface ElementsPanelProps {
  onDragStart: (blockType: BlockType) => void;
}

export default function ElementsPanel({ onDragStart }: ElementsPanelProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Элементы
        </h3>
        
        {Object.entries(BLOCK_CATEGORIES).map(([key, category]) => (
          <div key={key} className="mb-6">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">{category.icon}</span>
              <h4 className="font-medium text-gray-700">{category.title}</h4>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {category.blocks.map(blockType => (
                <DraggableElement
                  key={blockType}
                  blockType={blockType}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DraggableElementProps {
  blockType: string;
  onDragStart: (blockType: BlockType) => void;
}

function DraggableElement({ blockType, onDragStart }: DraggableElementProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'element',
      blockType
    }));
    onDragStart(blockType as BlockType);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg cursor-move transition-colors duration-200"
    >
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-700">
          {blockType}
        </span>
      </div>
    </div>
  );
}

