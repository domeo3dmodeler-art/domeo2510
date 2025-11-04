'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import HistoryModal from '@/components/ui/HistoryModal';
import CommentsModal from '@/components/ui/CommentsModal';
import { toast } from 'sonner';
import { Download, FileText, User, MapPin, Clock, X, Package, CreditCard } from 'lucide-react';
import { ORDER_STATUSES_COMPLECTATOR, ORDER_STATUSES_EXECUTOR, INVOICE_STATUSES, getStatusLabel } from '@/lib/utils/document-statuses';

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
  const [activeTab, setActiveTab] = useState<'items' | 'invoice' | 'quotes'>('items');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

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
      // Загружаем КП, которые ссылаются на этот заказ через parent_document_id
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

  // Определение статуса для отображения
  const getDisplayStatus = () => {
    if (!order) return null;
    
    // Для комплектатора: если есть счет, берем статус из счета (DRAFT, SENT, PAID, CANCELLED)
    // Если счета нет или статус заказа - статус исполнителя, показываем статус заказа
    if (userRole === 'complectator') {
      // Если есть счет со статусом из управляемых комплектатором, используем его
      if (order.invoice && ['DRAFT', 'SENT', 'PAID', 'CANCELLED'].includes(order.invoice.status)) {
        const status = order.invoice.status;
        const label = getStatusLabel(status, 'invoice');
        const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
        return { label, color, canManage: true };
      }
      
      // Иначе используем статус заказа (может быть статус исполнителя)
      const label = getStatusLabel(order.status, 'order');
      const color = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';
      // Комплектатор не может управлять статусами исполнителя
      const canManage = ['DRAFT', 'SENT', 'PAID', 'CANCELLED'].includes(order.status);
      return { label, color, canManage };
    }
    
    // Для исполнителя используем статусы Order
    if (userRole === 'executor') {
      const label = getStatusLabel(order.status, 'order_executor');
      const color = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';
      return { label, color, canManage: true };
    }
    
    // По умолчанию
    const label = getStatusLabel(order.status, 'order');
    const color = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800 border-gray-200';
    return { label, color, canManage: false };
  };

  // Получение товаров из заказа
  const getItems = () => {
    if (!order) return [];
    
    // Пытаемся получить товары из cart_data заказа
    if (order.cart_data) {
      try {
        const cartData = typeof order.cart_data === 'string' ? JSON.parse(order.cart_data) : order.cart_data;
        return cartData.items || cartData || [];
      } catch (e) {
        console.error('Error parsing cart_data:', e);
      }
    }
    
    // Если нет cart_data, пытаемся получить из счета
    if (order.invoice?.cart_data) {
      try {
        const invoiceCartData = typeof order.invoice.cart_data === 'string' 
          ? JSON.parse(order.invoice.cart_data) 
          : order.invoice.cart_data;
        return invoiceCartData.items || invoiceCartData || [];
      } catch (e) {
        console.error('Error parsing invoice cart_data:', e);
      }
    }
    
    return [];
  };

  // Очистка названия товара от артикула
  const cleanProductName = (name: string) => {
    if (!name) return '';
    return name
      .replace(/\s*\|\s*Артикул\s*:\s*[^|]*/gi, '')
      .replace(/\s*\*\*Артикул:.*?\*\*/g, '')
      .replace(/\s*Артикул:.*$/i, '')
      .trim();
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
        size="3xl"
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
                    Заказ {order.number}
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
              
              {/* Табы действий */}
              <div className="flex items-center space-x-4 mt-2">
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

            {/* Табы контента */}
            <div className="mb-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-6">
                <button
                  onClick={() => setActiveTab('items')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'items'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Товары ({items.length})
                </button>
                <button
                  onClick={() => setActiveTab('invoice')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'invoice'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Счет {order.invoice ? `(${order.invoice.number})` : ''}
                </button>
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'quotes'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  КП ({quotes.length})
                </button>
              </nav>
            </div>

            {/* Контент табов */}
            {activeTab === 'items' && (
              <div className="mb-6">
                {items.length > 0 ? (
                  <>
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
                            const cleanName = cleanProductName(item.name || item.product_name || item.notes || 'Товар');
                            
                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-2 py-3 text-center text-sm text-gray-900 font-medium">
                                  {index + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-gray-900 leading-tight">
                                    {(() => {
                                      const parts = cleanName.split(' (');
                                      if (parts.length > 1) {
                                        const mainName = parts[0];
                                        const characteristics = '(' + parts.slice(1).join(' (');
                                        return (
                                          <>
                                            <div className="font-semibold text-sm">{mainName}</div>
                                            <div className="text-gray-600 text-xs mt-1">{characteristics}</div>
                                          </>
                                        );
                                      }
                                      return <div className="font-semibold text-sm">{cleanName}</div>;
                                    })()}
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
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Товары не найдены
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invoice' && (
              <div className="mb-6">
                {order.invoice ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <CreditCard className="h-4 w-4 text-gray-600" />
                      <span className="font-semibold text-gray-900">Счет {order.invoice.number}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Статус:</span>{' '}
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                          STATUS_COLORS[order.invoice.status] || 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {getStatusLabel(order.invoice.status, 'invoice')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Сумма:</span>{' '}
                        <span className="font-medium">{order.invoice.total_amount.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      <button
                        onClick={() => {
                          // Открыть DocumentQuickViewModal для счета
                          window.location.href = `/documents/${order.invoice.id}`;
                        }}
                        className="text-xs text-blue-600 hover:underline mt-2"
                      >
                        Открыть детали счета
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Счет не создан
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quotes' && (
              <div className="mb-6">
                {quotes.length > 0 ? (
                  <div className="space-y-2">
                    {quotes.map((quote) => (
                      <div key={quote.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-gray-600" />
                          <span className="font-semibold text-gray-900">КП {quote.number}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Статус:</span>{' '}
                            <span className="font-medium">{quote.status}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Сумма:</span>{' '}
                            <span className="font-medium">{quote.total_amount.toLocaleString('ru-RU')} ₽</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Дата:</span>{' '}
                            <span className="font-medium">{new Date(quote.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    КП не найдены
                  </div>
                )}
              </div>
            )}
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

