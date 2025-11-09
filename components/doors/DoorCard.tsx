'use client';

import React, { useEffect, useState } from 'react';
import { clientLogger } from '@/lib/logging/client-logger';
import { formatModelNameForCard } from './utils';
import type { ModelItem } from './types';

interface DoorCardProps {
  item: ModelItem;
  selected: boolean;
  onSelect: () => void;
}

export function DoorCard({ item, selected, onSelect }: DoorCardProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Используем фото напрямую из данных модели
    clientLogger.debug('🔍 DoorCard useEffect, item:', {
      model: item.model,
      modelKey: item.modelKey,
      photo: item.photo,
      hasPhoto: !!item.photo
    });
    
    if (item.photo && typeof item.photo === 'string') {
      clientLogger.debug('📷 item.photo:', item.photo);
      clientLogger.debug('📷 startsWith("/uploads"):', item.photo.startsWith('/uploads'));
      
      // Если фото начинается с /uploads/, используем как есть
      // Если начинается с products/ или uploads/, добавляем /api
      let imageUrl: string;
      if (item.photo.startsWith('/uploads/')) {
        imageUrl = `/api${item.photo}`;
      } else if (item.photo.startsWith('/uploadsproducts')) {
        // Корректируем: /uploadsproducts/... -> /uploads/products/...
        imageUrl = `/api/uploads/products/${item.photo.substring(17)}`; // убираем первые 17 символов '/uploadsproducts'
      } else if (item.photo.startsWith('/uploads')) {
        // Корректируем: /uploads... -> /uploads/...
        imageUrl = `/api/uploads/${item.photo.substring(8)}`; // убираем первые 8 символов '/uploads'
      } else if (item.photo.startsWith('products/')) {
        imageUrl = `/api/uploads/${item.photo}`;
      } else if (item.photo.startsWith('uploads/')) {
        imageUrl = `/api/${item.photo}`;
      } else {
        imageUrl = `/api/uploads/${item.photo}`;
      }
      
      clientLogger.debug('📷 imageUrl:', imageUrl);
      setImageSrc(imageUrl);
      setIsLoading(false);
    } else if (item.modelKey) {
      // Fallback: загружаем фото через старый API используя modelKey
      const loadPhoto = async () => {
        try {
          setIsLoading(true);
          clientLogger.debug('🔄 Загружаем фото для карточки модели:', item.modelKey);

          const response = await fetch(`/api/catalog/doors/photos?model=${encodeURIComponent(item.modelKey || '')}`);

          if (response.ok) {
            const data = await response.json();
            if (data.photos && data.photos.length > 0) {
              const photoPath = data.photos[0];
              // Обрабатываем разные форматы путей
              let imageUrl: string;
              if (photoPath.startsWith('/uploads/')) {
                imageUrl = `/api${photoPath}`;
              } else if (photoPath.startsWith('/uploads')) {
                imageUrl = `/api/uploads/${photoPath.substring(8)}`;
              } else if (photoPath.startsWith('products/')) {
                imageUrl = `/api/uploads/${photoPath}`;
              } else if (photoPath.startsWith('uploads/')) {
                imageUrl = `/api/${photoPath}`;
              } else {
                imageUrl = `/api/uploads/${photoPath}`;
              }
              setImageSrc(imageUrl);
            } else {
              setImageSrc(null);
            }
          } else {
            setImageSrc(null);
          }
        } catch (error) {
          clientLogger.error('❌ Ошибка загрузки фото для карточки:', error);
          setImageSrc(null);
        } finally {
          setIsLoading(false);
        }
      };

      loadPhoto();
    } else {
      // Если фото нет, показываем placeholder
      setImageSrc(null);
      setIsLoading(false);
    }
  }, [item.model, item.modelKey, item.photo]);

  return (
    <div className="flex flex-col">
      <button
        onClick={onSelect}
        aria-label={`Выбрать модель ${formatModelNameForCard(item.model)}`}
        className={[
          "group w-full text-left bg-white overflow-hidden",
          "hover:shadow-md transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ring-offset-2",
          selected ? "shadow-md" : "",
        ].join(" ")}
      >
        {/* Фото полностью заполняет карточку с правильным соотношением сторон для дверей */}
        <div className="aspect-[16/33] w-full bg-gray-50 relative group overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 animate-pulse bg-gray-200" />
          ) : imageSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={formatModelNameForCard(item.model)}
                className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                onLoad={() => clientLogger.debug('✅ Изображение загружено для', item.model, ':', imageSrc)}
                onError={(e) => {
                  clientLogger.error('❌ ОШИБКА ЗАГРУЗКИ изображения:', imageSrc);
                  clientLogger.error('❌ item.photo:', item.photo);
                  clientLogger.error('❌ Тип imageSrc:', typeof imageSrc);
                  clientLogger.error('❌ item:', item);
                  setImageSrc(null);
                }}
              />
              {/* Индикатор галереи */}
              {item.hasGallery && (
                <div className="absolute top-2 right-2 bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-full font-medium shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  +{item.photos?.gallery.length || 0}
                </div>
              )}
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-sm">Нет фото</div>
                <div className="text-[14px] text-center whitespace-nowrap px-2" title={formatModelNameForCard(item.model)}>
                  {formatModelNameForCard(item.model)}
                </div>
              </div>
            </div>
          )}
        </div>
      </button>
      {/* Название модели под карточкой */}
      <div className="mt-2 flex justify-center">
        <div className="text-[14px] font-medium text-gray-900 text-center whitespace-nowrap px-2" title={formatModelNameForCard(item.model)}>
          {formatModelNameForCard(item.model)}
        </div>
      </div>
    </div>
  );
}

