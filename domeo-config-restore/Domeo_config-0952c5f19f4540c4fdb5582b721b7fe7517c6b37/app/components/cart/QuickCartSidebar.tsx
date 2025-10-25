'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { CartService } from '../../lib/cart/cart-service';
import { Cart, CartItem, CartCalculation } from '../../lib/cart/types';
import SimpleDocumentList from '../documents/SimpleDocumentList';

interface QuickCartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClientId?: string;
  sourceDocument?: {
    id: string;
    type: 'quote' | 'order' | 'invoice' | 'supplier_order';
    number: string;
  };
}

export default function QuickCartSidebar({
  isOpen,
  onClose,
  selectedClientId,
  sourceDocument
}: QuickCartSidebarProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [calculation, setCalculation] = useState<CartCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  const cartService = CartService.getInstance();

  useEffect(() => {
    const unsubscribe = cartService.subscribe((updatedCart) => {
      setCart(updatedCart);
      setCalculation(cartService.getCalculation());
    });

    const currentCart = cartService.getCart();
    setCart(currentCart);
    setCalculation(cartService.getCalculation());

    return unsubscribe;
  }, []);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    setIsLoading(true);
    try {
      if (newQuantity <= 0) {
        cartService.removeItem(itemId);
      } else {
        cartService.updateQuantity(itemId, newQuantity);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setIsLoading(true);
    try {
      cartService.removeItem(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickExport = async (documentType: 'quote' | 'invoice' | 'order' | 'supplier_order') => {
    if (!selectedClientId) {
      alert('Выберите клиента для создания документа');
      return;
    }

    setIsExporting(true);
    try {
      // Используем существующий API экспорта
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: documentType,
          format: 'pdf',
          clientId: selectedClientId,
          items: cart?.items || []
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Document created:', result);
        
        // Скачиваем файл
        const blob = new Blob([result.buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentType}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`${documentType} успешно создан и скачан!`);
        
        // Обновляем список документов
        if (showDocuments) {
          // TODO: Обновить список документов
        }
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error exporting document:', error);
      alert('Ошибка при создании документа');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateFromExisting = (sourceType: string, sourceId: string, targetType: string) => {
    console.log('Creating document from existing:', { sourceType, sourceId, targetType });
    // TODO: Предзаполнить корзину данными из исходного документа
    alert(`Создание ${targetType} на основе ${sourceType} - функция в разработке`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Корзина</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Source Document Info */}
          {sourceDocument && (
            <div className="border-b border-gray-200 bg-blue-50 px-4 py-2">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <FileText className="h-4 w-4" />
                <span>Создание на основе: {sourceDocument.type.toUpperCase()} {sourceDocument.number}</span>
              </div>
            </div>
          )}

          {/* Client Info */}
          {selectedClientId && (
            <div className="border-b border-gray-200 bg-green-50 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-green-700">
                  <FileText className="h-4 w-4" />
                  <span>Клиент выбран</span>
                </div>
                <button
                  onClick={() => setShowDocuments(!showDocuments)}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  {showDocuments ? 'Скрыть' : 'Показать'} документы
                </button>
              </div>
            </div>
          )}

          {/* Documents List */}
          {showDocuments && selectedClientId && (
            <div className="border-b border-gray-200 max-h-64 overflow-y-auto">
              <SimpleDocumentList
                clientId={selectedClientId}
                onDocumentSelect={(doc) => console.log('Selected:', doc)}
                onCreateDocument={handleCreateFromExisting}
              />
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart?.items && cart.items.length > 0 ? (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate text-sm">
                          {item.name || item.model}
                        </h3>
                        <div className="mt-1 text-xs text-gray-500">
                          {item.finish && <span>{item.finish}</span>}
                          {item.color && <span className="ml-1">{item.color}</span>}
                          {item.width && item.height && (
                            <span className="ml-1">{item.width}×{item.height}мм</span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          {Math.round(item.unitPrice || 0).toLocaleString()} ₽
                        </div>
                      </div>
                      
                      <div className="ml-3 flex items-center space-x-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, (item.qty || 1) - 1)}
                          disabled={isLoading}
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        
                        <span className="w-6 text-center text-sm font-medium">
                          {item.qty || 1}
                        </span>
                        
                        <button
                          onClick={() => handleUpdateQuantity(item.id, (item.qty || 1) + 1)}
                          disabled={isLoading}
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isLoading}
                          className="rounded-full p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Корзина пуста</p>
              </div>
            )}
          </div>

          {/* Summary and Quick Actions */}
          {cart?.items && cart.items.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-3">
              <div className="mb-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Итого:</span>
                  <span>{Math.round(calculation?.total || 0).toLocaleString()} ₽</span>
                </div>
              </div>

              {/* Quick Export Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleQuickExport('quote')}
                  disabled={isExporting || !selectedClientId}
                  className="flex items-center justify-center space-x-1 text-sm"
                  variant="outline"
                >
                  <FileText className="h-3 w-3" />
                  <span>КП</span>
                </Button>
                
                <Button
                  onClick={() => handleQuickExport('invoice')}
                  disabled={isExporting || !selectedClientId}
                  className="flex items-center justify-center space-x-1 text-sm"
                  variant="outline"
                >
                  <Download className="h-3 w-3" />
                  <span>Счет</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  onClick={() => handleQuickExport('order')}
                  disabled={isExporting || !selectedClientId}
                  className="flex items-center justify-center space-x-1 text-sm"
                  variant="outline"
                >
                  <ShoppingCart className="h-3 w-3" />
                  <span>Заказ</span>
                </Button>
                
                <Button
                  onClick={() => handleQuickExport('supplier_order')}
                  disabled={isExporting || !selectedClientId}
                  className="flex items-center justify-center space-x-1 text-sm"
                  variant="outline"
                >
                  <FileText className="h-3 w-3" />
                  <span>ЗП</span>
                </Button>
              </div>

              {!selectedClientId && (
                <div className="mt-2 text-center text-xs text-amber-600">
                  Выберите клиента для создания документов
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
