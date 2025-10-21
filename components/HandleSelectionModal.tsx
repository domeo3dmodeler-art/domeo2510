'use client';

import React, { useState, useEffect } from 'react';

type Handle = {
  id: string;
  name: string;
  group: string;
  price: number;
  isBasic: boolean;
  showroom: boolean;
  supplier?: string;
  article?: string;
  factoryName?: string;
  photos?: string[];
};

interface HandleSelectionModalProps {
  handles: Record<string, Handle[]>;
  selectedHandleId?: string;
  onSelect: (handleId: string) => void;
  onClose: () => void;
}

export default function HandleSelectionModal({
  handles,
  selectedHandleId,
  onSelect,
  onClose
}: HandleSelectionModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Получаем все доступные группы из handles
  const availableGroups = Object.keys(handles).filter(group => 
    handles[group] && handles[group].length > 0
  );
  
  // Устанавливаем первую группу по умолчанию
  useEffect(() => {
    if (availableGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(availableGroups[0]);
    }
  }, [availableGroups, selectedGroup]);
  
  const currentGroupHandles = selectedGroup ? handles[selectedGroup] || [] : [];
  
  // Получаем все фотографии из текущей группы для галереи
  const allPhotosInGroup = currentGroupHandles
    .flatMap(handle => handle.photos || [])
    .filter(photo => photo);
  
  const handlePhotoClick = (photoUrl: string) => {
    const photoIndex = allPhotosInGroup.findIndex(photo => photo === photoUrl);
    setCurrentPhotoIndex(photoIndex >= 0 ? photoIndex : 0);
    setZoomPhoto(photoUrl);
  };
  
  const handlePrevPhoto = () => {
    if (allPhotosInGroup.length > 0) {
      const newIndex = currentPhotoIndex > 0 ? currentPhotoIndex - 1 : allPhotosInGroup.length - 1;
      setCurrentPhotoIndex(newIndex);
      setZoomPhoto(allPhotosInGroup[newIndex]);
    }
  };
  
  const handleNextPhoto = () => {
    if (allPhotosInGroup.length > 0) {
      const newIndex = currentPhotoIndex < allPhotosInGroup.length - 1 ? currentPhotoIndex + 1 : 0;
      setCurrentPhotoIndex(newIndex);
      setZoomPhoto(allPhotosInGroup[newIndex]);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setZoomPhoto(null);
    } else if (e.key === 'ArrowLeft') {
      handlePrevPhoto();
    } else if (e.key === 'ArrowRight') {
      handleNextPhoto();
    }
  };
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-black">Выбор ручки</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 overflow-hidden">
            {/* Выбор группы */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-black mb-3">Группа ручек</h3>
              <div className="flex gap-2 flex-wrap">
                {availableGroups.map((group) => (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      selectedGroup === group
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {group}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Сетка ручек */}
            {selectedGroup && (
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">
                  Ручки группы "{selectedGroup}"
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentGroupHandles.map((handle) => (
                    <div
                      key={handle.id}
                      onClick={() => onSelect(handle.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedHandleId === handle.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {/* Фото ручки - уменьшенное поле отображения */}
                      <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden px-2 py-1">
                        {handle.photos && handle.photos.length > 0 ? (
                          <img
                            src={handle.photos[0]}
                            alt={handle.name}
                            className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePhotoClick(handle.photos![0]);
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) {
                                placeholder.classList.remove('hidden');
                              }
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center text-gray-400 ${handle.photos && handle.photos.length > 0 ? 'hidden' : ''}`}>
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Информация о ручке - без цены */}
                      <div className="text-center">
                        <h4 className="font-medium text-black text-sm mb-2 line-clamp-2">
                          {handle.name}
                        </h4>
                        {handle.showroom && (
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            В шоуруме
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                onSelect('');
                onClose();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Убрать ручку
            </button>
          </div>
        </div>
      </div>
      
      {/* Модальное окно зума фотографии */}
      {zoomPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Кнопка закрытия */}
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-3xl z-10"
            >
              ×
            </button>
            
            {/* Кнопка предыдущего фото */}
            {allPhotosInGroup.length > 1 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-8 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-4xl z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ‹
              </button>
            )}
            
            {/* Кнопка следующего фото */}
            {allPhotosInGroup.length > 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-8 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 text-4xl z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ›
              </button>
            )}
            
            {/* Фотография */}
            <img
              src={zoomPhoto}
              alt="Увеличенное фото ручки"
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Счетчик фотографий */}
            {allPhotosInGroup.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                {currentPhotoIndex + 1} / {allPhotosInGroup.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

