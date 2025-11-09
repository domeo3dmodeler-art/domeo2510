"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { clientLogger } from '@/lib/logging/client-logger';

interface PhotoStructure {
  cover: string | null;
  gallery: string[];
}

interface ModernPhotoGalleryProps {
  photos: PhotoStructure;
  productName: string;
  hasGallery: boolean;
  onToggleSidePanels?: (hide: boolean) => void;
}

export function ModernPhotoGallery({ photos, productName, hasGallery, onToggleSidePanels }: ModernPhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Получаем все фото в правильном порядке
  const allPhotos = photos.cover ? [photos.cover, ...photos.gallery] : photos.gallery;
  
  // Логируем для отладки
  useEffect(() => {
    if (allPhotos.length > 0) {
      clientLogger.debug('📸 ModernPhotoGallery allPhotos:', {
        cover: photos.cover,
        gallery: photos.gallery,
        allPhotos: allPhotos.slice(0, 3),
        hasGallery
      });
    }
  }, [photos.cover, photos.gallery, hasGallery]);
  
  // Показываем миниатюры только если есть галерея
  const showThumbnails = hasGallery && allPhotos.length > 1;

  const nextPhoto = () => {
    clientLogger.debug('🔍 nextPhoto вызван:', { currentIndex, allPhotosLength: allPhotos.length });
    setCurrentIndex((prev) => {
      const next = (prev + 1) % allPhotos.length;
      clientLogger.debug('🔍 nextPhoto новый индекс:', { prev, next });
      return next;
    });
  };

  const prevPhoto = () => {
    clientLogger.debug('🔍 prevPhoto вызван:', { currentIndex, allPhotosLength: allPhotos.length });
    setCurrentIndex((prev) => {
      const next = (prev - 1 + allPhotos.length) % allPhotos.length;
      clientLogger.debug('🔍 prevPhoto новый индекс:', { prev, next });
      return next;
    });
  };

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
  };

  const toggleZoom = () => {
    const newZoomState = !isZoomed;
    clientLogger.debug('🔍 toggleZoom вызван:', { isZoomed, newZoomState });
    setIsZoomed(newZoomState);
    // Управляем видимостью боковых панелей
    if (onToggleSidePanels) {
      onToggleSidePanels(newZoomState);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsZoomed(false);
      if (onToggleSidePanels) {
        onToggleSidePanels(false);
      }
    }
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
  };

  // Сбрасываем индекс и зум при смене модели/продукта
  useEffect(() => {
    setCurrentIndex(0);
    setIsZoomed(false);
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [productName, photos.cover]); // Сбрасываем при смене продукта или обложки

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  if (allPhotos.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="text-sm font-medium">Нет фото</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full w-full relative group focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Основное изображение */}
      <div className="relative h-full w-full bg-gray-50">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
        )}
        
        <div className="h-full w-full flex items-center justify-center">
          {allPhotos[currentIndex] ? (
            <img
              src={(() => {
                const photo = allPhotos[currentIndex];
                let imageUrl: string;
                if (photo.startsWith('/uploads/')) {
                  imageUrl = `/api${photo}`;
                } else if (photo.startsWith('/uploadsproducts')) {
                  imageUrl = `/api/uploads/products/${photo.substring(17)}`;
                } else if (photo.startsWith('/uploads')) {
                  imageUrl = `/api/uploads/${photo.substring(8)}`;
                } else if (photo.startsWith('products/')) {
                  imageUrl = `/api/uploads/${photo}`;
                } else if (photo.startsWith('uploads/')) {
                  imageUrl = `/api/${photo}`;
                } else {
                  imageUrl = `/api/uploads${photo}`;
                }
                clientLogger.debug('🖼️ ModernPhotoGallery imageUrl:', { photo, imageUrl });
                return imageUrl;
              })()}
              alt={`${productName} - фото ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain transition-all duration-300 hover:scale-105 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clientLogger.debug('🖼️ Клик по изображению для зума');
                toggleZoom();
              }}
              onError={() => {
                clientLogger.debug('❌ Ошибка загрузки изображения:', allPhotos[currentIndex]);
              }}
            />
          ) : (
            <div className="text-gray-400 text-center">
              <div className="text-sm">Нет фото</div>
              <div className="text-xs">{productName}</div>
            </div>
          )}
        </div>

        {/* Кнопка зума */}
        {allPhotos[currentIndex] && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleZoom();
            }}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 z-10"
            aria-label={isZoomed ? "Уменьшить" : "Увеличить"}
          >
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-700" />
        </button>
        )}

        {/* Навигационные стрелки (только для галереи) */}
        {allPhotos.length > 1 && allPhotos[currentIndex] && (
          <>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clientLogger.debug('⬅️ Клик по кнопке "Предыдущее фото"');
                prevPhoto();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 z-10"
              aria-label="Предыдущее фото"
            >
              <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
            </button>
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clientLogger.debug('➡️ Клик по кнопке "Следующее фото"');
                nextPhoto();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 z-10"
              aria-label="Следующее фото"
            >
              <ChevronRightIcon className="w-6 h-6 text-gray-700" />
            </button>
          </>
        )}

        {/* Индикатор текущего фото */}
        {allPhotos.length > 1 && allPhotos[currentIndex] && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
            {currentIndex + 1} / {allPhotos.length}
          </div>
        )}
      </div>

      {/* Миниатюры под изображением (только для галереи) */}
      {showThumbnails && allPhotos.length > 1 && (
        <div className="absolute -bottom-20 left-0 right-0 bg-white p-4 rounded-b-xl shadow-lg">
          <div className="flex justify-center space-x-2 overflow-x-auto">
            {allPhotos.map((photo, index) => (
              photo ? (
                <button
                  key={index}
                  onClick={() => goToPhoto(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    index === currentIndex 
                      ? 'border-blue-500 shadow-lg scale-110' 
                      : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                  }`}
                  aria-label={`Перейти к фото ${index + 1}`}
                >
                  <img
                    src={(() => {
                      if (photo.startsWith('/uploads/')) {
                        return `/api${photo}`;
                      } else if (photo.startsWith('/uploadsproducts')) {
                        return `/api/uploads/products/${photo.substring(17)}`;
                      } else if (photo.startsWith('/uploads')) {
                        return `/api/uploads/${photo.substring(8)}`;
                      } else if (photo.startsWith('products/')) {
                        return `/api/uploads/${photo}`;
                      } else if (photo.startsWith('uploads/')) {
                        return `/api/${photo}`;
                      } else {
                        return `/api/uploads${photo}`;
                      }
                    })()}
                    alt={`Миниатюра ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => {
                      clientLogger.debug('❌ Ошибка загрузки миниатюры:', photo);
                    }}
                  />
                </button>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Полноэкранный режим при зуме */}
      {isZoomed && allPhotos[currentIndex] && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-auto"
          onClick={() => {
            setIsZoomed(false);
            if (onToggleSidePanels) {
              onToggleSidePanels(false);
            }
          }}
        >
          <div className="relative max-w-7xl w-full max-h-[90vh] flex flex-col">
            {/* Основное изображение */}
            <div className="flex items-center justify-center relative flex-none max-h-[80vh]">
              <img
                src={(() => {
                  const photo = allPhotos[currentIndex];
                  if (photo.startsWith('/uploads/')) {
                    return `/api${photo}`;
                  } else if (photo.startsWith('/uploadsproducts')) {
                    return `/api/uploads/products/${photo.substring(17)}`;
                  } else if (photo.startsWith('/uploads')) {
                    return `/api/uploads/${photo.substring(8)}`;
                  } else if (photo.startsWith('products/')) {
                    return `/api/uploads/${photo}`;
                  } else if (photo.startsWith('uploads/')) {
                    return `/api/${photo}`;
                  } else {
                    return `/api/uploads${photo}`;
                  }
                })()}
                alt={`${productName} - увеличенное фото ${currentIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* Навигационные стрелки */}
              {showThumbnails && allPhotos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevPhoto();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-all duration-200"
                    aria-label="Предыдущее фото"
                  >
                    <ChevronLeftIcon className="w-8 h-8" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextPhoto();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-3 transition-all duration-200"
                    aria-label="Следующее фото"
                  >
                    <ChevronRightIcon className="w-8 h-8" />
                  </button>
                </>
              )}
            </div>
            
            {/* Миниатюры внизу */}
            {showThumbnails && allPhotos.length > 1 && (
              <div className="bg-black/50 p-4 flex-none">
                <div className="flex justify-center space-x-3 overflow-x-auto">
                  {allPhotos.map((photo, index) => (
                    photo ? (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPhoto(index);
                        }}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          index === currentIndex 
                            ? 'border-white shadow-lg scale-110' 
                            : 'border-white/50 hover:border-white/80 hover:scale-105'
                        }`}
                        aria-label={`Перейти к фото ${index + 1}`}
                      >
                        <img
                          src={photo.startsWith('/uploads') ? `/api${photo}` : `/api/uploads${photo}`}
                          alt={`Миниатюра ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={() => {
                            clientLogger.debug('❌ Ошибка загрузки миниатюры:', photo);
                          }}
                        />
                      </button>
                    ) : null
                  ))}
                </div>
              </div>
            )}
            
            {/* Кнопка закрытия */}
            <button
              onClick={() => {
                setIsZoomed(false);
                if (onToggleSidePanels) {
                  onToggleSidePanels(false);
                }
              }}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors duration-200"
              aria-label="Закрыть"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
