'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui';
import StatCard from '../../../components/ui/StatCard';
import { 
  FileText, 
  Download, 
  Users,
  TrendingUp,
  Loader2,
  Search,
  Phone,
  History,
  StickyNote,
  BadgeCheck,
  Package,
  Factory,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface ExecutorStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

export default function ExecutorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ExecutorStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Клиенты + документы
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    address?: string;
    lastActivityAt?: string;
    lastDoc?: { type: 'invoice'|'supplier_order'; status: string; id: string; date: string; total?: number };
  }>>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientTab, setClientTab] = useState<'invoices'|'supplier_orders'>('invoices');
  const [invoices, setInvoices] = useState<Array<{ 
    id: string; 
    number: string; 
    date: string; 
    status: 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'; 
    total: number 
  }>>([]);
  const [supplierOrders, setSupplierOrders] = useState<Array<{ 
    id: string; 
    number: string; 
    date: string; 
    status: 'Ожидает'|'Заказан'|'В производстве'|'Готов'|'Отменен'; 
    supplier: string;
    expectedDate?: string;
  }>>([]);
  const [showInWorkOnly, setShowInWorkOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInvoiceActions, setShowInvoiceActions] = useState<{ [key: string]: boolean }>({});
  const [statusDropdown, setStatusDropdown] = useState<{type: 'invoice'|'supplier_order', id: string, x: number, y: number} | null>(null);

  // Загрузка клиентов
  const fetchClients = async () => {
    try {
      console.log('🔄 Fetching clients...');
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Clients loaded:', data);
        setClients(data.clients || []);
      } else {
        console.error('❌ Failed to load clients:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading clients:', error);
    }
  };

  // Загрузка документов клиента
  const fetchClientDocuments = async (clientId: string) => {
    try {
      console.log('🔄 Fetching documents for client:', clientId);
      const response = await fetch(`/api/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Client documents loaded:', data);
        
        // Маппинг счетов
        const mappedInvoices = (data.client.invoices || []).map((invoice: any) => ({
          id: invoice.id,
          number: `СЧ-${invoice.number}`,
          date: new Date(invoice.created_at).toLocaleDateString('ru-RU'),
          status: mapInvoiceStatus(invoice.status),
          total: invoice.total_amount || 0
        }));
        setInvoices(mappedInvoices);

        // Загрузка заказов у поставщика для каждого заказа клиента
        const orders = data.client.orders || [];
        const allSupplierOrders: any[] = [];
        
        for (const order of orders) {
          try {
            const supplierResponse = await fetch(`/api/supplier-orders?orderId=${order.id}`);
            if (supplierResponse.ok) {
              const supplierData = await supplierResponse.json();
              allSupplierOrders.push(...supplierData.supplierOrders);
            }
          } catch (error) {
            console.error('Error fetching supplier orders for order:', order.id, error);
          }
        }
        
        // Маппинг заказов у поставщика
        const mappedSupplierOrders = allSupplierOrders.map((supplierOrder: any) => ({
          id: supplierOrder.id,
          number: `ЗП-${supplierOrder.id.slice(-6)}`,
          date: new Date(supplierOrder.created_at).toLocaleDateString('ru-RU'),
          status: mapSupplierOrderStatus(supplierOrder.status),
          supplier: supplierOrder.supplier_name,
          expectedDate: supplierOrder.expected_date ? new Date(supplierOrder.expected_date).toLocaleDateString('ru-RU') : undefined
        }));
        setSupplierOrders(mappedSupplierOrders);
      } else {
        console.error('❌ Failed to load client documents:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading client documents:', error);
    }
  };

  // Маппинг статусов счетов
  const mapInvoiceStatus = (apiStatus: string): 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен' => {
    const statusMap: Record<string, 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'> = {
      'DRAFT': 'Черновик',
      'SENT': 'Отправлен',
      'PAID': 'Оплачен/Заказ',
      'CANCELLED': 'Отменен',
      'IN_PRODUCTION': 'В производстве',
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
      'COMPLETED': 'Исполнен',
      'draft': 'Черновик',
      'sent': 'Отправлен',
      'paid': 'Оплачен/Заказ',
      'cancelled': 'Отменен',
      'in_production': 'В производстве',
      'received': 'Получен от поставщика',
      'completed': 'Исполнен'
    };
    return statusMap[apiStatus] || 'Черновик';
  };

  // Маппинг статусов заказов у поставщика
  const mapSupplierOrderStatus = (apiStatus: string): 'Ожидает'|'Заказан'|'В производстве'|'Готов'|'Отменен' => {
    const statusMap: Record<string, 'Ожидает'|'Заказан'|'В производстве'|'Готов'|'Отменен'> = {
      'PENDING': 'Ожидает',
      'ORDERED': 'Заказан',
      'IN_PRODUCTION': 'В производстве',
      'READY': 'Готов',
      'CANCELLED': 'Отменен',
      'pending': 'Ожидает',
      'ordered': 'Заказан',
      'in_production': 'В производстве',
      'ready': 'Готов',
      'cancelled': 'Отменен'
    };
    return statusMap[apiStatus] || 'Ожидает';
  };

  // Обновление статуса счета
  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      console.log('🚀 updateInvoiceStatus called with:', { invoiceId, newStatus });
      const statusMap: Record<string, string> = {
        'Черновик': 'DRAFT',
        'Отправлен': 'SENT',
        'Оплачен/Заказ': 'PAID',
        'Отменен': 'CANCELLED',
        'В производстве': 'IN_PRODUCTION',
        'Получен от поставщика': 'RECEIVED_FROM_SUPPLIER',
        'Исполнен': 'COMPLETED'
      };
      const apiStatus = statusMap[newStatus] || newStatus;
      console.log('📤 Sending to API:', { apiStatus });
      
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus })
      });
      
      console.log('📥 API Response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response data:', result);
        
        const reverseStatusMap: Record<string, string> = {
          'DRAFT': 'Черновик',
          'SENT': 'Отправлен',
          'PAID': 'Оплачен/Заказ',
          'CANCELLED': 'Отменен',
          'IN_PRODUCTION': 'В производстве',
          'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
          'COMPLETED': 'Исполнен'
        };
        const russianStatus = reverseStatusMap[result.invoice.status] || result.invoice.status;
        console.log('🔄 Mapped status:', { apiStatus: result.invoice.status, russianStatus });
        
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? { ...inv, status: russianStatus as any } : inv
        ));
        
        if (selectedClient) {
          console.log('🔄 Refreshing client data...');
          fetchClientDocuments(selectedClient);
        }
        
        hideStatusDropdown();
        console.log('✅ Invoice status update completed successfully');
        return result.invoice;
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Ошибка при изменении статуса счета');
      }
    } catch (error) {
      console.error('❌ Error updating invoice status:', error);
      alert(`Ошибка при изменении статуса счета: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      throw error;
    }
  };

  // Обновление статуса заказа у поставщика
  const updateSupplierOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      console.log('🚀 updateSupplierOrderStatus called with:', { orderId, newStatus });
      const statusMap: Record<string, string> = {
        'Ожидает': 'PENDING',
        'Заказан': 'ORDERED',
        'В производстве': 'IN_PRODUCTION',
        'Готов': 'READY',
        'Отменен': 'CANCELLED'
      };
      const apiStatus = statusMap[newStatus] || newStatus;
      console.log('📤 Sending to API:', { apiStatus });
      
      const response = await fetch(`/api/supplier-orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus })
      });
      
      console.log('📥 API Response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response data:', result);
        
        const reverseStatusMap: Record<string, string> = {
          'PENDING': 'Ожидает',
          'ORDERED': 'Заказан',
          'IN_PRODUCTION': 'В производстве',
          'READY': 'Готов',
          'CANCELLED': 'Отменен'
        };
        const russianStatus = reverseStatusMap[result.supplierOrder.status] || result.supplierOrder.status;
        console.log('🔄 Mapped status:', { apiStatus: result.supplierOrder.status, russianStatus });
        
        setSupplierOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status: russianStatus as any } : order
        ));
        
        if (selectedClient) {
          console.log('🔄 Refreshing client data...');
          fetchClientDocuments(selectedClient);
        }
        
        hideStatusDropdown();
        console.log('✅ Supplier order status update completed successfully');
        return result.supplierOrder;
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || 'Ошибка при изменении статуса заказа у поставщика');
      }
    } catch (error) {
      console.error('❌ Error updating supplier order status:', error);
      alert(`Ошибка при изменении статуса заказа у поставщика: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      throw error;
    }
  };

  // Показать выпадающее меню статуса
  const showStatusDropdown = (type: 'invoice'|'supplier_order', id: string, event: React.MouseEvent) => {
    console.log('🎯 Showing status dropdown:', { type, id });
    const rect = event.currentTarget.getBoundingClientRect();
    setStatusDropdown({
      type,
      id,
      x: rect.left,
      y: rect.bottom + 4
    });
  };

  // Скрыть выпадающее меню статуса
  const hideStatusDropdown = () => {
    setStatusDropdown(null);
  };

  // Обработка клика вне выпадающего меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdown) {
        const target = event.target as HTMLElement;
        // Проверяем, что клик не по выпадающему меню и не по кнопке статуса
        if (!target.closest('[data-status-dropdown]') && !target.closest('button[class*="rounded-full"]')) {
          hideStatusDropdown();
        }
      }
    };

    if (statusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [statusDropdown]);

  // Обработка клика вне меню действий счетов
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-invoice-actions]')) {
        setShowInvoiceActions({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Обработка действий над счетами
  const handleInvoiceAction = (invoiceId: string, action: 'create_invoice' | 'create_supplier_order') => {
    console.log('Invoice action:', { invoiceId, action });
    
    if (action === 'create_invoice') {
      // Создание нового счета на основе существующего
      alert('Создание счета на основе существующего - функция в разработке');
    } else if (action === 'create_supplier_order') {
      // Создание заказа у поставщика на основе счета
      createSupplierOrderFromInvoice(invoiceId);
    }
    
    // Закрываем меню
    setShowInvoiceActions(prev => ({ ...prev, [invoiceId]: false }));
  };

  const createSupplierOrderFromInvoice = async (invoiceId: string) => {
    try {
      // Получаем данные счета
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        alert('Счет не найден');
        return;
      }

      // Используем механизм генерации заказа из корзины
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'supplier_order',
          format: 'pdf',
          clientId: selectedClient,
          items: [], // TODO: Получить товары из счета
          sourceInvoiceId: invoiceId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Supplier Order created:', result);
        
        // Скачиваем файл
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
        
        // Обновляем данные клиента
        if (selectedClient) {
          fetchClientDocuments(selectedClient);
        }
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating supplier order:', error);
      alert('Ошибка при создании заказа у поставщика');
    }
  };

  const toggleInvoiceActions = (invoiceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setShowInvoiceActions(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  // Создание клиента
  const createClient = async (clientData: any) => {
    try {
      console.log('🔄 Creating client:', clientData);
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Client created:', result);
        setShowCreateModal(false);
        fetchClients(); // Обновляем список клиентов
        return result.client;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to create client:', errorData);
        throw new Error(errorData.error || 'Ошибка при создании клиента');
      }
    } catch (error) {
      console.error('❌ Error creating client:', error);
      alert(`Ошибка при создании клиента: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      throw error;
    }
  };

  // Фильтрация клиентов
  const filteredClients = clients.filter(client => {
    const matchesSearch = !search || 
      `${client.firstName} ${client.lastName} ${client.middleName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
      client.phone?.includes(search) ||
      client.address?.toLowerCase().includes(search.toLowerCase());
    
    if (!showInWorkOnly) return matchesSearch;
    
    // Показываем только клиентов с незавершенными документами
    const hasUnfinishedDocs = client.lastDoc && 
      (client.lastDoc.status !== 'Исполнен' && 
       client.lastDoc.status !== 'Отменен' && 
       client.lastDoc.status !== 'Готов');
    
    return matchesSearch && hasUnfinishedDocs;
  });

  // Загрузка данных при монтировании
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchClients();
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Загрузка документов при выборе клиента
  useEffect(() => {
    if (selectedClient) {
      fetchClientDocuments(selectedClient);
    }
  }, [selectedClient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая панель - Список клиентов */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Клиенты</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-3 py-1 text-sm border border-gray-300 hover:border-black transition-all duration-200"
                      title="Создать нового клиента"
                    >
                      Создать
                    </button>
                    <button
                      onClick={() => setShowInWorkOnly(v => !v)}
                      className={`px-3 py-1 text-sm border transition-all duration-200 ${showInWorkOnly ? 'border-black bg-black text-white' : 'border-gray-300 hover:border-black'}`}
                      title="Показать клиентов с незавершенными документами"
                    >
                      В работе
                    </button>
                  </div>
                </div>

                {/* Поиск */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Поиск клиентов..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Список клиентов */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedClient === client.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {client.firstName} {client.lastName} {client.middleName || ''}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {client.address}
                      </div>
                      {client.lastDoc && (
                        <div className="text-xs text-gray-400 mt-1">
                          Последний документ: {client.lastDoc.type === 'invoice' ? 'Счет' : 'Заказ у поставщика'} {client.lastDoc.id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Правая панель - Детали клиента */}
          <div className="lg:col-span-2">
            {selectedClient ? (
              <Card className="h-full">
                <div className="p-6">
                  {(() => {
                    const client = clients.find(c => c.id === selectedClient);
                    if (!client) return null;
                    
                    return (
                      <>
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {client.firstName} {client.lastName} {client.middleName || ''}
                          </h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            {client.phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {client.phone}
                              </div>
                            )}
                            {client.address && (
                              <div className="flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                {client.address}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Вкладки документов */}
                        <div className="mb-6">
                          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                            <button
                              onClick={() => setClientTab('invoices')}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                clientTab === 'invoices'
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Счета
                            </button>
                            <button
                              onClick={() => setClientTab('supplier_orders')}
                              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                clientTab === 'supplier_orders'
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Заказ у поставщика
                            </button>
                          </div>
                        </div>

                        {/* Содержимое вкладок */}
                        <div className="space-y-4">
                          {clientTab === 'invoices' && (
                            <>
                              {invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <div>
                                          <div className="font-medium text-gray-900">{invoice.number}</div>
                                          <div className="text-sm text-gray-500">{invoice.date}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-900">
                                          {invoice.total.toLocaleString('ru-RU')} ₽
                                        </span>
                                        <button
                                          onClick={(e) => showStatusDropdown('invoice', invoice.id, e)}
                                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            invoice.status === 'Черновик' ? 'bg-gray-100 text-gray-700' :
                                            invoice.status === 'Отправлен' ? 'bg-blue-100 text-blue-700' :
                                            invoice.status === 'Оплачен/Заказ' ? 'bg-green-100 text-green-700' :
                                            invoice.status === 'Отменен' ? 'bg-red-100 text-red-700' :
                                            invoice.status === 'В производстве' ? 'bg-yellow-100 text-yellow-700' :
                                            invoice.status === 'Получен от поставщика' ? 'bg-purple-100 text-purple-700' :
                                            'bg-green-100 text-green-700'
                                          }`}
                                        >
                                          {invoice.status}
                                        </button>
                                        
                                        {/* Кнопка действий */}
                                        <div className="relative" data-invoice-actions>
                                          <button
                                            onClick={(e) => toggleInvoiceActions(invoice.id, e)}
                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                            title="Действия"
                                          >
                                            <MoreVertical className="h-4 w-4 text-gray-500" />
                                          </button>
                                          
                                          {/* Выпадающее меню действий */}
                                          {showInvoiceActions[invoice.id] && (
                                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                                              <div className="py-1">
                                                <button
                                                  onClick={() => handleInvoiceAction(invoice.id, 'create_invoice')}
                                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                                >
                                                  <FileText className="h-4 w-4" />
                                                  <span>Создать счет</span>
                                                </button>
                                                <button
                                                  onClick={() => handleInvoiceAction(invoice.id, 'create_supplier_order')}
                                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                                >
                                                  <Factory className="h-4 w-4" />
                                                  <span>Заказ у поставщика</span>
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Комментарии и история изменений будут здесь
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                  <p>Счетов пока нет</p>
                                </div>
                              )}
                            </>
                          )}

                          {clientTab === 'supplier_orders' && (
                            <>
                              {supplierOrders.length > 0 ? (
                                supplierOrders.map((order) => (
                                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-3">
                                        <Factory className="h-5 w-5 text-orange-600" />
                                        <div>
                                          <div className="font-medium text-gray-900">{order.number}</div>
                                          <div className="text-sm text-gray-500">{order.date}</div>
                                          <div className="text-xs text-gray-400">{order.supplier}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {order.expectedDate && (
                                          <span className="text-sm text-gray-500">
                                            Ожидается: {order.expectedDate}
                                          </span>
                                        )}
                                        <button
                                          onClick={(e) => showStatusDropdown('supplier_order', order.id, e)}
                                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                            order.status === 'Ожидает' ? 'bg-gray-100 text-gray-700' :
                                            order.status === 'Заказан' ? 'bg-blue-100 text-blue-700' :
                                            order.status === 'В производстве' ? 'bg-yellow-100 text-yellow-700' :
                                            order.status === 'Готов' ? 'bg-green-100 text-green-700' :
                                            'bg-red-100 text-red-700'
                                          }`}
                                        >
                                          {order.status}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Комментарии и история изменений будут здесь
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <Factory className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                  <p>Заказов у поставщика пока нет</p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Card>
            ) : (
              <Card className="h-full">
                <div className="p-6 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Выберите клиента для просмотра документов</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Выпадающее меню статуса */}
      {statusDropdown && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-xl shadow-xl py-2 min-w-[160px] backdrop-blur-sm"
          style={{ left: statusDropdown.x, top: statusDropdown.y }}
          data-status-dropdown
        >
          {statusDropdown.type === 'invoice' && (
            <>
              {statusDropdown.id && (() => {
                const invoice = invoices.find(i => i.id === statusDropdown!.id);
                if (!invoice) return null;
                
                const getAllStatuses = () => {
                  return ['Черновик', 'Отправлен', 'Оплачен/Заказ', 'Отменен', 'В производстве', 'Получен от поставщика', 'Исполнен'];
                };
                const allStatuses = getAllStatuses();
                
                return allStatuses.map((status, index) => (
                  <div key={status}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateInvoiceStatus(invoice.id, status);
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200 ${
                        invoice.status === status
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{status}</span>
                        {invoice.status === status && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                    {index < allStatuses.length - 1 && (
                      <div className="mx-4 border-t border-gray-100"></div>
                    )}
                  </div>
                ));
              })()}
            </>
          )}

          {statusDropdown.type === 'supplier_order' && (
            <>
              {statusDropdown.id && (() => {
                const order = supplierOrders.find(o => o.id === statusDropdown!.id);
                if (!order) return null;
                
                const getAllStatuses = () => {
                  return ['Ожидает', 'Заказан', 'В производстве', 'Готов', 'Отменен'];
                };
                const allStatuses = getAllStatuses();
                
                return allStatuses.map((status, index) => (
                  <div key={status}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSupplierOrderStatus(order.id, status);
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200 ${
                        order.status === status
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{status}</span>
                        {order.status === status && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                    {index < allStatuses.length - 1 && (
                      <div className="mx-4 border-t border-gray-100"></div>
                    )}
                  </div>
                ));
              })()}
            </>
          )}
        </div>
      )}

      {/* Модальное окно создания клиента */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Создать клиента</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const clientData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                middleName: formData.get('middleName'),
                phone: formData.get('phone'),
                address: formData.get('address')
              };
              createClient(clientData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Отчество</label>
                  <input
                    type="text"
                    name="middleName"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                  <textarea
                    name="address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Отмена
                </Button>
                <Button type="submit">
                  Создать
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}