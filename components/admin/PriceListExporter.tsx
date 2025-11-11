'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/ui';
import { FileSpreadsheet } from 'lucide-react';
import { clientLogger } from '@/lib/logging/client-logger';

interface PriceListExporterProps {
  catalogCategoryId: string | null;
  catalogCategoryName?: string;
}

export default function PriceListExporter({ catalogCategoryId, catalogCategoryName }: PriceListExporterProps) {
  const [exporting, setExporting] = useState(false);

  // Проверяем роль пользователя
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
  const isAdmin = userRole === 'admin';

  const downloadPriceList = async () => {
    if (!catalogCategoryId) {
      alert('Пожалуйста, выберите категорию для экспорта прайса.');
      return;
    }

    if (!isAdmin) {
      alert('Экспорт прайса доступен только администраторам.');
      return;
    }

    setExporting(true);
    try {
      const response = await fetch(`/api/admin/export/price-list?catalogCategoryId=${catalogCategoryId}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `price_${catalogCategoryName || 'catalog'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('Прайс успешно экспортирован в Excel! Все товары категории включены.');
      } else {
        // Не показываем ошибку 403 как критическую, это нормально для не-админов
        if (response.status === 403) {
          clientLogger.debug('Доступ запрещен к экспорту прайса');
          alert('Экспорт прайса доступен только администраторам.');
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
          clientLogger.error('Failed to export price list:', errorData.error);
          alert(`Ошибка при экспорте прайса: ${errorData.error?.message || errorData.error || 'Неизвестная ошибка'}`);
        }
      }
    } catch (error) {
      clientLogger.error('Error exporting price list:', error);
      alert('Произошла ошибка при экспорте прайса.');
    } finally {
      setExporting(false);
    }
  };

  const disabled = !catalogCategoryId || !isAdmin;

  // Не показываем кнопку, если пользователь не админ
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={downloadPriceList}
        disabled={disabled || exporting}
        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Скачать прайс в Excel (все товары категории)"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        {exporting ? 'Экспорт...' : 'Скачать прайс'}
      </button>
    </div>
  );
}