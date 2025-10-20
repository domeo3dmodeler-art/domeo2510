'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui';
import CartSidebar from '../cart/CartSidebar';
import SimpleDocumentList from '../documents/SimpleDocumentList';
import { ShoppingCart, FileText, Download, Receipt, Factory } from 'lucide-react';

interface DocumentGenerationIntegrationProps {
  selectedClientId?: string;
  userRole: 'complectator' | 'executor';
}

export default function DocumentGenerationIntegration({ 
  selectedClientId, 
  userRole 
}: DocumentGenerationIntegrationProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Функции генерации документов из корзины
  const handleGenerateQuote = async () => {
    if (!selectedClientId) {
      alert('Выберите клиента для создания КП');
      return;
    }

    setIsGenerating(true);
    try {
      // Используем ваш существующий API
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quote',
          format: 'pdf',
          clientId: selectedClientId,
          items: [] // Пустой массив - корзина будет использована автоматически
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Quote generated:', result);
        
        // Скачиваем файл
        const blob = new Blob([result.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quote-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('КП успешно создан и скачан!');
        
        // Обновляем список документов если он открыт
        if (showDocuments) {
          // TODO: Обновить список документов
        }
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating quote:', error);
      alert('Ошибка при создании КП');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedClientId) {
      alert('Выберите клиента для создания счета');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          format: 'pdf',
          clientId: selectedClientId,
          items: []
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Invoice generated:', result);
        
        const blob = new Blob([result.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Счет успешно создан и скачан!');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Ошибка при создании счета');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateOrder = async () => {
    if (!selectedClientId) {
      alert('Выберите клиента для создания заказа');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order',
          format: 'pdf',
          clientId: selectedClientId,
          items: []
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Order generated:', result);
        
        const blob = new Blob([result.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Заказ успешно создан и скачан!');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating order:', error);
      alert('Ошибка при создании заказа');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSupplierOrder = async () => {
    if (!selectedClientId) {
      alert('Выберите клиента для создания заказа у поставщика');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'supplier_order',
          format: 'pdf',
          clientId: selectedClientId,
          items: []
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Supplier Order generated:', result);
        
        const blob = new Blob([result.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supplier-order-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Заказ у поставщика успешно создан и скачан!');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating supplier order:', error);
      alert('Ошибка при создании заказа у поставщика');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Кнопки генерации документов */}
      <div className="flex items-center space-x-2">
        {/* Корзина */}
        <Button
          onClick={() => setIsCartOpen(true)}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Корзина</span>
        </Button>

        {/* Быстрые кнопки генерации документов */}
        {selectedClientId && (
          <>
            <Button
              onClick={handleGenerateQuote}
              disabled={isGenerating}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <FileText className="h-4 w-4" />
              <span>КП</span>
            </Button>
            
            <Button
              onClick={handleGenerateInvoice}
              disabled={isGenerating}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>Счет</span>
            </Button>
            
            <Button
              onClick={handleGenerateOrder}
              disabled={isGenerating}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Receipt className="h-4 w-4" />
              <span>Заказ</span>
            </Button>
            
            {userRole === 'executor' && (
              <Button
                onClick={handleGenerateSupplierOrder}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Factory className="h-4 w-4" />
                <span>ЗП</span>
              </Button>
            )}
          </>
        )}

        {/* Кнопка показа документов клиента */}
        {selectedClientId && (
          <Button
            onClick={() => setShowDocuments(!showDocuments)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {showDocuments ? 'Скрыть' : 'Показать'} документы
          </Button>
        )}
      </div>

      {/* Список документов клиента */}
      {showDocuments && selectedClientId && (
        <div className="mt-4">
          <SimpleDocumentList
            clientId={selectedClientId}
            onDocumentSelect={(doc) => console.log('Selected document:', doc)}
            onCreateDocument={(sourceType, sourceId, targetType) => {
              console.log('Create document:', { sourceType, sourceId, targetType });
              // TODO: Реализовать создание связанных документов
            }}
          />
        </div>
      )}

      {/* Существующая корзина (без изменений) */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onGenerateQuote={handleGenerateQuote}
        onGenerateInvoice={handleGenerateInvoice}
        onGenerateOrder={handleGenerateOrder}
      />
    </>
  );
}
