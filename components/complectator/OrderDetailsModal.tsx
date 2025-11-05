'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import HistoryModal from '@/components/ui/HistoryModal';
import CommentsModal from '@/components/ui/CommentsModal';
import { toast } from 'sonner';
import { Download, FileText, User, MapPin, Clock, Package } from 'lucide-react';
import { getStatusLabel } from '@/lib/utils/document-statuses';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  userRole: string;
}

interface OrderData {
  id: string;
  number: string;
  status: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone: string;
    address?: string;
    fullName: string;
  };
  invoice: {
    id: string;
    number: string;
    status: string;
    total_amount: number;
    cart_data?: any;
  } | null;
  cart_data?: any;
  total_amount?: number;
  created_at: string;
  updated_at: string;
}

interface Quote {
  id: string;
  number: string;
  status: string;
  total_amount: number;
  created_at: string;
}

// Цвета для статусов
const STATUS_COLORS: Record<string, string> = {
  'DRAFT': 'bg-gray-100 text-gray-800 border-gray-200',
  'SENT': 'bg-blue-100 text-blue-800 border-blue-200',
  'PAID': 'bg-green-100 text-green-800 border-green-200',
  'ORDERED': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'RECEIVED_FROM_SUPPLIER': 'bg-purple-100 text-purple-800 border-purple-200',
  'COMPLETED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
  'NEW_PLANNED': 'bg-gray-100 text-gray-800 border-gray-200',
  'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'AWAITING_MEASUREMENT': 'bg-orange-100 text-orange-800 border-orange-200',
  'AWAITING_INVOICE': 'bg-blue-100 text-blue-800 border-blue-200'
};

export function OrderDetailsModal({ isOpen, onClose, orderId, userRole }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [exportingInvoice, setExportingInvoice] = useState(false);
  const [exportingQuote, setExportingQuote] = useState<string | null>(null);
  const [showExportInvoiceMenu, setShowExportInvoiceMenu] = useState(false);
  const [showExportQuoteMenu, setShowExportQuoteMenu] = useState<string | null>(null);

  // Загрузка заказа
  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          toast.error('Ошибка при загрузке заказа');
          onClose();
        }
      } else {
        toast.error('Ошибка при загрузке заказа');
        onClose();
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Ошибка при загрузке заказа');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [orderId, onClose]);

  // Загрузка связанных КП
  const fetchQuotes = useCallback(async () => {
    if (!orderId) return;
    
    try {
      const response = await fetch(`/api/quotes?parent_document_id=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.quotes) {
          setQuotes(data.quotes);
        }
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder();
      fetchQuotes();
    }
  }, [isOpen, orderId, fetchOrder, fetchQuotes]);

  // Закрытие меню экспорта при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowExportInvoiceMenu(false);
        setShowExportQuoteMenu(null);
      }
    };

    if (showExportInvoiceMenu || showExportQuoteMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportInvoiceMenu, showExportQuoteMenu]);

  // Определение статуса для отображения
  const getDisplayStatus = () => {
    if (!order) return null;
    
    if (userRole === 'complectator') {
      if (order.invoice && ['DRAFT', 'SENT', 'PAID', 'CANCELLED'].includes(order.invoice.status)) {
        const status = order.invoice.status;
        const label = getStatusLabel(status, 'invoice');
        const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
        return { label, color, canManage: true };
      }
      
      const label = getStatusLabel(order.status, 'order');
      const color = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';
      const canManage = ['DRAFT', 'SENT', 'PAID', 'CANCELLED'].includes(order.status);
      return { label, color, canManage };
    }
    
    if (userRole === 'executor') {
      const label = getStatusLabel(order.status, 'order_executor');
      const color = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';
      return { label, color, canManage: true };
    }
    
    const label = getStatusLabel(order.status, 'order');
    const color = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';
    return { label, color, canManage: false };
  };

  // Получение товаров из заказа
  const getItems = useCallback(() => {
    if (!order) return [];
    
    if (order.cart_data) {
      try {
        const cartData = typeof order.cart_data === 'string' ? JSON.parse(order.cart_data) : order.cart_data;
        if (cartData.items && Array.isArray(cartData.items)) {
          return cartData.items;
        }
        if (Array.isArray(cartData)) {
          return cartData;
        }
        return [];
      } catch (e) {
        console.error('Error parsing cart_data:', e);
      }
    }
    
    if (order.invoice?.cart_data) {
      try {
        const invoiceCartData = typeof order.invoice.cart_data === 'string' 
          ? JSON.parse(order.invoice.cart_data) 
          : order.invoice.cart_data;
        if (invoiceCartData.items && Array.isArray(invoiceCartData.items)) {
          return invoiceCartData.items;
        }
        if (Array.isArray(invoiceCartData)) {
          return invoiceCartData;
        }
        return [];
      } catch (e) {
        console.error('Error parsing invoice cart_data:', e);
      }
    }
    
    return [];
  }, [order]);

  // Очистка названия товара от артикула
  const cleanProductName = (name: string) => {
    if (!name) return '';
    return name
      .replace(/\s*\|\s*Артикул\s*:\s*[^|]*/gi, '')
      .replace(/\s*\*\*Артикул:.*?\*\*/g, '')
      .replace(/\s*Артикул:.*$/i, '')
      .trim();
  };

  // Экспорт счета
  const handleExportInvoice = async (format: 'pdf' | 'excel' = 'pdf') => {
    if (!order?.invoice?.id) {
      toast.error('Счет не найден');
      return;
    }

    setExportingInvoice(true);
    setShowExportInvoiceMenu(false);
    try {
      const response = await fetch(`/api/documents/${order.invoice.id}/export?format=${format}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = format === 'pdf' ? 'pdf' : 'xlsx';
        a.download = `Счет-${order.invoice.number}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Счет успешно экспортирован в ${format === 'pdf' ? 'PDF' : 'Excel'}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        toast.error(`Ошибка при экспорте счета: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error exporting invoice:', error);
      toast.error('Ошибка при экспорте счета');
    } finally {
      setExportingInvoice(false);
    }
  };

  // Экспорт КП
  const handleExportQuote = async (quoteId: string, format: 'pdf' | 'excel' = 'pdf') => {
    setExportingQuote(quoteId);
    setShowExportQuoteMenu(null);
    try {
      // Используем универсальный API экспорта документов
      const response = await fetch(`/api/documents/${quoteId}/export?format=${format}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const quote = quotes.find(q => q.id === quoteId);
        const extension = format === 'pdf' ? 'pdf' : 'xlsx';
        a.download = `КП-${quote?.number || quoteId}.${extension}`;
        
        document.body.appendChild(a);
        a.href = url;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`КП успешно экспортирован в ${format === 'pdf' ? 'PDF' : 'Excel'}`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }));
        toast.error(`Ошибка при экспорте КП: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error exporting quote:', error);
      toast.error('Ошибка при экспорте КП');
    } finally {
      setExportingQuote(null);
    }
  };

  if (!isOpen) return null;

  const displayStatus = getDisplayStatus();
  const items = getItems();

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title=""
        size="xl"
        className="!max-w-[1208px]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : order ? (
          <div className="p-6">
            {/* Заголовок заказа */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-lg text-gray-900">
                    {order.number}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {displayStatus && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${displayStatus.color}`}>
                      {displayStatus.label}
                      {!displayStatus.canManage && (
                        <span className="ml-1 text-xs opacity-75">(только просмотр)</span>
                      )}
                    </span>
                  )}
                  {(order.total_amount || order.invoice?.total_amount) && (
                    <span className="font-bold text-gray-900 text-base">
                      {(order.total_amount || order.invoice?.total_amount)?.toLocaleString('ru-RU')} ₽
                    </span>
                  )}
                </div>
              </div>
              
              {/* Действия */}
              <div className="flex items-center space-x-4 mt-2 flex-wrap gap-2">
                <button 
                  onClick={() => setIsCommentsModalOpen(true)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <div className="w-3 h-3 bg-green-100 rounded-sm flex items-center justify-center">
                    <FileText className="h-2 w-2 text-green-600" />
                  </div>
                  <span className="text-xs">Комментарии</span>
                </button>
                <button 
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <div className="w-3 h-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <Clock className="h-2 w-2 text-gray-600" />
                  </div>
                  <span className="text-xs">История</span>
                </button>
                
                {/* Кнопка экспорта счета с выбором формата */}
                {order.invoice ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowExportInvoiceMenu(!showExportInvoiceMenu)}
                      disabled={exportingInvoice}
                      className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="h-3 w-3" />
                      <span className="text-xs">
                        {exportingInvoice ? 'Экспорт...' : 'Экспорт счета'}
                      </span>
                    </button>
                    {showExportInvoiceMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
                        <button
                          onClick={() => handleExportInvoice('pdf')}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <span>📄 PDF</span>
                        </button>
                        <button
                          onClick={() => handleExportInvoice('excel')}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <span>📊 Excel</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    disabled
                    className="flex items-center space-x-1 text-gray-400 cursor-not-allowed"
                    title="Счет не создан"
                  >
                    <Download className="h-3 w-3" />
                    <span className="text-xs">Экспорт счета</span>
                  </button>
                )}
                
                {/* Кнопки экспорта КП с выбором формата */}
                {quotes.length > 0 ? (
                  quotes.map((quote) => (
                    <div key={quote.id} className="relative">
                      <button
                        onClick={() => setShowExportQuoteMenu(showExportQuoteMenu === quote.id ? null : quote.id)}
                        disabled={exportingQuote === quote.id}
                        className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="h-3 w-3" />
                        <span className="text-xs">
                          {exportingQuote === quote.id ? 'Экспорт...' : `Экспорт КП ${quote.number}`}
                        </span>
                      </button>
                      {showExportQuoteMenu === quote.id && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
                          <button
                            onClick={() => handleExportQuote(quote.id, 'pdf')}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>📄 PDF</span>
                          </button>
                          <button
                            onClick={() => handleExportQuote(quote.id, 'excel')}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <span>📊 Excel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <button
                    disabled
                    className="flex items-center space-x-1 text-gray-400 cursor-not-allowed"
                    title="КП не созданы"
                  >
                    <Download className="h-3 w-3" />
                    <span className="text-xs">Экспорт КП</span>
                  </button>
                )}
              </div>
            </div>

            {/* Информация о клиенте */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              {order.client ? (
                <>
                  <div className="flex items-center space-x-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {order.client.fullName}
                    </span>
                    {order.client.phone && (
                      <span className="text-xs text-gray-600">{order.client.phone}</span>
                    )}
                  </div>
                  {order.client.address && (
                    <div className="flex items-center space-x-1 mt-1 ml-5">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-600">{order.client.address}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-sm text-gray-500">Клиент не указан</span>
                </div>
              )}
            </div>

            {/* Заголовок раздела товаров */}
            <div className="mb-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 pb-2">
                Товары ({items.length})
              </h3>
            </div>

            {/* Контент товаров */}
            <div className="mb-6">
              {items.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-2 py-3 text-center w-8 text-xs font-medium">№</th>
                        <th className="px-4 py-3 text-left text-xs font-medium">Наименование</th>
                        <th className="px-2 py-3 text-center w-16 text-xs font-medium">Кол-во</th>
                        <th className="px-2 py-3 text-right w-20 text-xs font-medium">Цена</th>
                        <th className="px-4 py-3 text-right w-24 text-xs font-medium">Сумма</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item: any, index: number) => {
                        const quantity = item.quantity || item.qty || 1;
                        const unitPrice = item.unit_price || item.price || 0;
                        const totalPrice = quantity * unitPrice;
                        
                        // Простое определение ручки: проверяем type или handleId из корзины
                        const isHandle = item.type === 'handle' || !!item.handleId;
                        
                        // Формируем название товара точно как в корзине
                        let displayName: string;
                        if (item.name) {
                          // Если есть сохраненное название - используем его
                          displayName = item.name;
                        } else if (isHandle) {
                          // Ручка - формируем название
                          const handleName = item.handleName || 'Неизвестная ручка';
                          displayName = `Ручка ${handleName}`;
                        } else {
                          // Дверь - формируем полное название как в корзине
                          const modelName = item.model?.replace(/DomeoDoors_/g, '').replace(/_/g, ' ') || 'Неизвестная модель';
                          const hardwareKitName = item.hardwareKitName?.replace('Комплект фурнитуры — ', '') || 'Базовый';
                          displayName = `Дверь DomeoDoors ${modelName} (${item.finish || ''}, ${item.color || ''}, ${item.width || ''} × ${item.height || ''} мм, Фурнитура - ${hardwareKitName})`;
                        }
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-2 py-3 text-center text-sm text-gray-900 font-medium">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900 leading-tight">
                                <div className="font-semibold text-sm">{displayName}</div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center text-sm text-gray-900 font-medium">
                              {quantity}
                            </td>
                            <td className="px-2 py-3 text-right text-sm text-gray-900">
                              {unitPrice.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                              {totalPrice.toLocaleString('ru-RU')} ₽
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Итого */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                    <div className="flex justify-end">
                      <span className="text-base font-bold text-gray-900">
                        Итого: {(order.total_amount || order.invoice?.total_amount || 0).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Товары не найдены
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Заказ не найден</p>
          </div>
        )}
      </Modal>

      {/* Модальное окно истории */}
      {order && (
        <HistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          documentId={order.id}
          documentType="order"
          documentNumber={order.number}
        />
      )}

      {/* Модальное окно комментариев */}
      {order && (
        <CommentsModal
          isOpen={isCommentsModalOpen}
          onClose={() => setIsCommentsModalOpen(false)}
          documentId={order.id}
          documentType="order"
          documentNumber={order.number}
        />
      )}
    </>
  );
}