'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, FileText, Download, ArrowRight, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { CartService } from '../../lib/cart/cart-service';
import { Cart, CartItem, CartCalculation } from '../../lib/cart/types';
import DocumentTree from '../documents/DocumentTree';

interface EnhancedCartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClientId?: string;
  sourceDocument?: {
    id: string;
    type: 'quote' | 'order' | 'invoice' | 'supplier_order';
    number: string;
  };
}

export default function EnhancedCartSidebar({
  isOpen,
  onClose,
  selectedClientId,
  sourceDocument
}: EnhancedCartSidebarProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [calculation, setCalculation] = useState<CartCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [showDocumentTree, setShowDocumentTree] = useState(false);
  const [createdDocuments, setCreatedDocuments] = useState<any[]>([]);

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
  }, [cartService]);

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

  const handleExportDocument = async (documentType: 'quote' | 'invoice' | 'order' | 'supplier_order') => {
    if (!selectedClientId) {
      toast.error('Выберите клиента для создания документа');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/cart/export/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: cart,
          documentType,
          format: exportFormat,
          clientId: selectedClientId,
          sourceDocumentId: sourceDocument?.id,
          sourceDocumentType: sourceDocument?.type,
          userId: 'current_user', // TODO: получить из контекста
          additionalData: {
            notes: `Создан на основе ${sourceDocument?.type} ${sourceDocument?.number}` || 'Создан из корзины'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Document created:', result.document);
        
        // Добавляем в список созданных документов
        setCreatedDocuments(prev => [...prev, result.document]);
        
        // Скачиваем файл
        const blob = new Blob([Buffer.from(result.file.buffer, 'base64')], { 
          type: result.file.mimeType 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`${documentType} успешно создан и скачан!`);
      } else {
        const error = await response.json();
        toast.error(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error exporting document:', error);
      toast.error('Ошибка при создании документа');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateFromExisting = (sourceType: string, sourceId: string, targetType: string) => {
    // Эта функция будет вызвана из DocumentTree
    console.log('Creating document from existing:', { sourceType, sourceId, targetType });
    // Можно добавить логику для предзаполнения корзины данными из исходного документа
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-6 w-6 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Корзина</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Source Document Info */}
          {sourceDocument && (
            <div className="border-b border-gray-200 bg-blue-50 px-6 py-3">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <ArrowRight className="h-4 w-4" />
                <span>Создание на основе:</span>
                <span className="font-medium">
                  {sourceDocument.type.toUpperCase()} {sourceDocument.number}
                </span>
              </div>
            </div>
          )}

          {/* Client Info */}
          {selectedClientId && (
            <div className="border-b border-gray-200 bg-green-50 px-6 py-3">
              <div className="flex items-center space-x-2 text-sm text-green-700">
                <FileText className="h-4 w-4" />
                <span>Клиент выбран</span>
              </div>
            </div>
          )}

          {/* Export Format Selector */}
          <div className="border-b border-gray-200 px-6 py-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Формат:</span>
              <div className="flex space-x-2">
                {(['pdf', 'excel', 'csv'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      exportFormat === format
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Tree Toggle */}
          {selectedClientId && (
            <div className="border-b border-gray-200 px-6 py-3">
              <button
                onClick={() => setShowDocumentTree(!showDocumentTree)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <FileText className="h-4 w-4" />
                <span>{showDocumentTree ? 'Скрыть' : 'Показать'} документооборот</span>
              </button>
            </div>
          )}

          {/* Document Tree */}
          {showDocumentTree && selectedClientId && (
            <div className="border-b border-gray-200 max-h-64 overflow-y-auto">
              <DocumentTree
                clientId={selectedClientId}
                onDocumentSelect={(doc) => console.log('Selected:', doc)}
                onCreateDocument={handleCreateFromExisting}
              />
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart?.items && cart.items.length > 0 ? (
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {item.name || item.model}
                        </h3>
                        <div className="mt-1 text-sm text-gray-500">
                          {item.finish && <span>{item.finish}</span>}
                          {item.color && <span className="ml-1">{item.color}</span>}
                          {item.width && item.height && (
                            <span className="ml-1">{item.width}×{item.height}мм</span>
                          )}
                        </div>
                        <div className="mt-2 text-sm font-medium text-gray-900">
                          {Math.round(item.unitPrice || 0).toLocaleString()} ₽
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, (item.qty || 1) - 1)}
                          disabled={isLoading}
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        
                        <span className="w-8 text-center text-sm font-medium">
                          {item.qty || 1}
                        </span>
                        
                        <button
                          onClick={() => handleUpdateQuantity(item.id, (item.qty || 1) + 1)}
                          disabled={isLoading}
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isLoading}
                          className="rounded-full p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Корзина пуста</p>
              </div>
            )}
          </div>

          {/* Summary and Actions */}
          {cart?.items && cart.items.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="mb-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Итого:</span>
                  <span>{Math.round(calculation?.total || 0).toLocaleString()} ₽</span>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleExportDocument('quote')}
                    disabled={isExporting || !selectedClientId}
                    className="flex items-center justify-center space-x-2"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4" />
                    <span>КП</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleExportDocument('invoice')}
                    disabled={isExporting || !selectedClientId}
                    className="flex items-center justify-center space-x-2"
                    variant="outline"
                  >
                    <Download className="h-4 w-4" />
                    <span>Счет</span>
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleExportDocument('order')}
                    disabled={isExporting || !selectedClientId}
                    className="flex items-center justify-center space-x-2"
                    variant="outline"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Заказ</span>
                  </Button>
                  
                  <Button
                    onClick={() => handleExportDocument('supplier_order')}
                    disabled={isExporting || !selectedClientId}
                    className="flex items-center justify-center space-x-2"
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Заказ у поставщика</span>
                  </Button>
                </div>
              </div>

              {!selectedClientId && (
                <div className="mt-3 text-center text-sm text-amber-600">
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
