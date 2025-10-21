'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card } from '../../../components/ui';
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
  ShoppingCart,
  Package,
  Plus,
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
  const [activeTab, setActiveTab] = useState<'cart' | 'documents' | 'orders'>('cart');
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
  const [invoices, setInvoices] = useState<Array<{ id: string; number: string; date: string; status: 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'; total: number; dueAt?: string }>>([]);
  const [supplierOrders, setSupplierOrders] = useState<Array<{ id: string; number: string; date: string; status: 'Черновик'|'Отправлен'|'В производстве'|'Получен от поставщика'|'Исполнен'; total: number; supplierName?: string }>>([]);
  const [invoicesFilter, setInvoicesFilter] = useState<'all'|'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'>('all');
  const [supplierOrdersFilter, setSupplierOrdersFilter] = useState<'all'|'Черновик'|'Отправлен'|'В производстве'|'Получен от поставщика'|'Исполнен'>('all');
  const [showInWorkOnly, setShowInWorkOnly] = useState(false);
  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    address: '',
    objectId: ''
  });
  const [statusDropdown, setStatusDropdown] = useState<{type: 'invoice'|'supplier_order', id: string, x: number, y: number} | null>(null);
  const [showInvoiceActions, setShowInvoiceActions] = useState<string | null>(null);
  const [showSupplierOrderActions, setShowSupplierOrderActions] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchClients();
  }, []);

  // Закрытие выпадающих меню при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdown) {
        const target = event.target as HTMLElement;
        // Проверяем, что клик не по выпадающему меню и не по кнопке статуса
        if (!target.closest('[data-status-dropdown]') && !target.closest('button[class*="rounded-full"]')) {
          hideStatusDropdown();
        }
      }
      
      const target = event.target as HTMLElement;
      if (!target.closest('[data-invoice-actions]') && !target.closest('[data-supplier-order-actions]')) {
        setShowInvoiceActions(null);
        setShowSupplierOrderActions(null);
      }
    };

    if (statusDropdown || showInvoiceActions || showSupplierOrderActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [statusDropdown, showInvoiceActions, showSupplierOrderActions]);

  // Загрузка списка клиентов (оптимизированная)
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        // Преобразуем данные клиентов в нужный формат
        const formattedClients = data.clients.map((client: any) => ({
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          middleName: client.middleName,
          phone: client.phone,
          address: client.address,
          objectId: client.objectId,
          lastActivityAt: client.createdAt,
          lastDoc: undefined // Будет загружаться отдельно при выборе клиента
        }));
        setClients(formattedClients);
      } else {
        console.error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  // Загрузка документов клиента (оптимизированная с мемоизацией)
  const fetchClientDocuments = useCallback(async (clientId: string) => {
    try {
      // Показываем индикатор загрузки
      setInvoices([]);
      setSupplierOrders([]);
      
      const response = await fetch(`/api/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        const client = data.client;
        
        // Преобразуем Счета (только нужные поля)
        const formattedInvoices = client.invoices.map((invoice: any) => ({
          id: invoice.id,
          number: invoice.number ? invoice.number.replace('INVOICE-', 'СЧ-') : `СЧ-${invoice.id.slice(-6)}`,
          date: new Date(invoice.created_at).toISOString().split('T')[0],
          status: mapInvoiceStatus(invoice.status),
          total: Number(invoice.total_amount) || 0,
          dueAt: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : undefined
        }));
        setInvoices(formattedInvoices);
        
        // Преобразуем Заказы у поставщика (только нужные поля)
        const formattedSupplierOrders = client.supplierOrders?.map((so: any) => ({
          id: so.id,
          number: `ЗП-${so.id.slice(-6)}`,
          date: new Date(so.created_at).toISOString().split('T')[0],
          status: mapSupplierOrderStatus(so.status),
          total: so.order?.total_amount || 0,
          supplierName: so.supplier_name
        })) || [];
        setSupplierOrders(formattedSupplierOrders);
      } else {
        console.error('Failed to fetch client documents');
      }
    } catch (error) {
      console.error('Error fetching client documents:', error);
    }
  }, []);

  // Оптимизированная фильтрация клиентов с мемоизацией
  const filteredClients = useMemo(() => {
    return clients
      .filter(c => !showInWorkOnly || !isTerminalDoc(c.lastDoc))
      .filter(c => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const fio = `${c.lastName} ${c.firstName} ${c.middleName || ''}`.toLowerCase();
        return fio.includes(q) || (c.phone||'').toLowerCase().includes(q) || (c.address||'').toLowerCase().includes(q);
      })
      .sort((a,b) => {
        const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return tb - ta;
      });
  }, [clients, search, showInWorkOnly]);

  // Маппинг статусов Счетов из API в русские
  const mapInvoiceStatus = (apiStatus: string): 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен' => {
    const statusMap: Record<string, 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'> = {
      'DRAFT': 'Черновик',
      'SENT': 'Отправлен',
      'PAID': 'Оплачен/Заказ',
      'CANCELLED': 'Отменен',
      'IN_PRODUCTION': 'В производстве',
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
      'COMPLETED': 'Исполнен',
      // Поддержка старых строчных статусов
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

  // Маппинг статусов Заказов у поставщика из API в русские
  const mapSupplierOrderStatus = (apiStatus: string): 'Черновик'|'Отправлен'|'В производстве'|'Получен от поставщика'|'Исполнен' => {
    const statusMap: Record<string, 'Черновик'|'Отправлен'|'В производстве'|'Получен от поставщика'|'Исполнен'> = {
      'PENDING': 'Черновик',
      'SENT': 'Отправлен',
      'IN_PRODUCTION': 'В производстве',
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
      'COMPLETED': 'Исполнен',
      // Поддержка старых строчных статусов
      'pending': 'Черновик',
      'sent': 'Отправлен',
      'in_production': 'В производстве',
      'received_from_supplier': 'Получен от поставщика',
      'completed': 'Исполнен'
    };
    return statusMap[apiStatus] || 'Черновик';
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Имитация загрузки статистики
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStats({ totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0 });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedClient) return;
    fetchClientDocuments(selectedClient);
  }, [selectedClient]);

  const formatPhone = (raw?: string) => {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    const d = digits.length >= 10 ? digits.slice(-10) : digits;
    if (d.length < 10) return raw;
    return `+7 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,8)}-${d.slice(8,10)}`;
  };

  const badgeByInvoiceStatus = (s: 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен') => {
    switch (s) {
      case 'Черновик': return 'border-gray-300 text-gray-700';
      case 'Отправлен': return 'border-blue-300 text-blue-700';
      case 'Оплачен/Заказ': return 'border-green-300 text-green-700';
      case 'Отменен': return 'border-red-300 text-red-700';
      case 'В производстве': return 'border-yellow-300 text-yellow-800';
      case 'Получен от поставщика': return 'border-purple-300 text-purple-700';
      case 'Исполнен': return 'border-emerald-300 text-emerald-700';
    }
  };

  const badgeBySupplierOrderStatus = (s: 'Черновик'|'Отправлен'|'В производстве'|'Получен от поставщика'|'Исполнен') => {
    switch (s) {
      case 'Черновик': return 'border-gray-300 text-gray-700';
      case 'Отправлен': return 'border-blue-300 text-blue-700';
      case 'В производстве': return 'border-yellow-300 text-yellow-800';
      case 'Получен от поставщика': return 'border-purple-300 text-purple-700';
      case 'Исполнен': return 'border-emerald-300 text-emerald-700';
    }
  };

  const isTerminalDoc = (doc?: { type: 'invoice'|'supplier_order'; status: string }) => {
    if (!doc) return false;
    if (doc.type === 'invoice') {
      return doc.status === 'Исполнен' || doc.status === 'Отменен';
    }
    // supplier_order
    return doc.status === 'Исполнен';
  };

  // Создание нового клиента
  const createClient = async (clientData: any) => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData)
      });

      if (response.ok) {
        const data = await response.json();
        // Обновляем список клиентов
        const newClient = {
          id: data.client.id,
          firstName: data.client.firstName,
          lastName: data.client.lastName,
          middleName: data.client.middleName,
          phone: data.client.phone,
          address: data.client.address,
          objectId: data.client.objectId,
          lastActivityAt: data.client.createdAt,
          lastDoc: undefined
        };
        setClients(prev => [...prev, newClient]);
        setSelectedClient(data.client.id);
        setShowCreateClientForm(false);
        setNewClientData({
          firstName: '',
          lastName: '',
          middleName: '',
          phone: '',
          address: '',
          objectId: ''
        });
        return data.client;
      } else {
        throw new Error('Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Ошибка при создании клиента');
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

  // Скрыть выпадающее меню
  const hideStatusDropdown = () => {
    setStatusDropdown(null);
  };

  // Изменение статуса Счета
  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      console.log('🚀 updateInvoiceStatus called with:', { invoiceId, newStatus });
      
      // Маппинг русских статусов на английские для API
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: apiStatus })
      });

      console.log('📥 API Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API Response data:', result);
        
        // Маппинг обратно на русские статусы
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
        
        // Обновляем список Счетов
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? { 
            ...inv, 
            status: russianStatus as any
          } : inv
        ));
        
        hideStatusDropdown();
        console.log('✅ Invoice status update completed successfully');
        return result.invoice;
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        console.error('❌ Response status:', response.status);
        console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
        throw new Error(errorData.error || 'Ошибка при изменении статуса счета');
      }
    } catch (error) {
      console.error('❌ Error updating invoice status:', error);
      alert(`Ошибка при изменении статуса счета: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      throw error;
    }
  };

  // Создание нового счета из существующего счета
  const createInvoiceFromInvoice = async (invoiceId: string) => {
    try {
      // Получаем данные счета
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        alert('Счет не найден');
        return;
      }

      // Получаем полные данные счета из API
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
      if (!invoiceResponse.ok) {
        alert('Ошибка при получении данных счета');
        return;
      }
      
      const invoiceData = await invoiceResponse.json();
      
      if (!invoiceData.invoice.cart_data) {
        alert('Нет данных корзины для создания нового счета');
        return;
      }

      const cartData = JSON.parse(invoiceData.invoice.cart_data);
      
      // Создаем новый счет через API
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invoice',
          format: 'pdf',
          clientId: invoiceData.invoice.client_id,
          items: cartData,
          totalAmount: invoice.total
        })
      });

      if (response.ok) {
        // Получаем PDF файл и скачиваем его
        const pdfBlob = await response.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        
        // Получаем имя файла из заголовков ответа
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'invoice.pdf';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Обновляем данные клиента
        if (selectedClient) {
          fetchClientDocuments(selectedClient);
        }
        alert('Счет создан и скачан успешно');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating invoice from invoice:', error);
      alert('Ошибка при создании счета');
    }
  };

  // Создание заказа у поставщика из счета
  const createSupplierOrderFromInvoice = async (invoiceId: string) => {
    try {
      // Получаем данные счета
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        alert('Счет не найден');
        return;
      }

      // Получаем полные данные счета из API
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
      if (!invoiceResponse.ok) {
        alert('Ошибка при получении данных счета');
        return;
      }
      
      const invoiceData = await invoiceResponse.json();
      let orderId = invoiceData.invoice.order_id;
      
      // Если у счета нет связанного заказа, создаем его
      if (!orderId) {
        console.log('🔄 Creating Order for Invoice:', invoiceId);
        
        const cartData = invoiceData.invoice.cart_data ? JSON.parse(invoiceData.invoice.cart_data) : null;
        
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: invoiceData.invoice.client_id,
            status: 'PENDING',
            total_amount: invoiceData.invoice.total_amount,
            currency: invoiceData.invoice.currency || 'RUB',
            notes: `Автоматически создан из счета ${invoice.number} для Заказа у поставщика`,
            cart_data: cartData,
            items: cartData && cartData.items ? cartData.items.map((item: any) => ({
              productId: item.id || 'unknown',
              quantity: item.quantity || item.qty || 1,
              price: item.unitPrice || item.price || 0,
              notes: item.name || item.model || ''
            })) : []
          })
        });

        if (!orderResponse.ok) {
          const error = await orderResponse.json();
          alert(`Ошибка при создании заказа: ${error.error}`);
          return;
        }
        const newOrder = await orderResponse.json();
        orderId = newOrder.order.id;

        // Обновляем счет, чтобы связать его с новым заказом
        await fetch(`/api/invoices/${invoiceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId })
        });
        console.log('✅ Invoice updated with new Order ID:', orderId);
      }

      // Создаем заказ у поставщика через API
      const response = await fetch('/api/supplier-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          supplierName: 'Поставщик по умолчанию',
          supplierEmail: '',
          supplierPhone: '',
          expectedDate: null,
          notes: `Создан на основе счета ${invoice.number}`,
          cartData: invoiceData.invoice.cart_data ? JSON.parse(invoiceData.invoice.cart_data) : { items: [] }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Supplier Order created:', result);

        // Генерируем Excel файл заказа у поставщика
        try {
          await generateSupplierOrderExcel(result.supplierOrder.id);
        } catch (excelError) {
          console.error('Error generating Excel:', excelError);
          alert('Заказ у поставщика создан, но произошла ошибка при генерации Excel файла');
        }

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

  // Генерация Excel файла заказа у поставщика
  const generateSupplierOrderExcel = async (supplierOrderId: string) => {
    try {
      console.log('📊 Generating Excel for supplier order:', supplierOrderId);
      
      const response = await fetch(`/api/supplier-orders/${supplierOrderId}/excel`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Заказ_у_поставщика_${supplierOrderId.slice(-6)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Excel file downloaded successfully');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при генерации Excel файла');
      }
    } catch (error) {
      console.error('❌ Error generating Excel:', error);
      throw error;
    }
  };

  // Удаление счета
  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот счет?')) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Обновляем локальный список
        setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        
        // Обновляем данные клиента
        if (selectedClient) {
          await fetchClientDocuments(selectedClient);
        }
        
        alert('Счет удален успешно');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Ошибка при удалении счета');
    }
  };

  // Удаление заказа у поставщика
  const deleteSupplierOrder = async (supplierOrderId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот заказ у поставщика?')) return;

    try {
      const response = await fetch(`/api/supplier-orders/${supplierOrderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Обновляем локальный список
        setSupplierOrders(prev => prev.filter(so => so.id !== supplierOrderId));
        
        // Обновляем данные клиента
        if (selectedClient) {
          await fetchClientDocuments(selectedClient);
        }
        
        alert('Заказ у поставщика удален успешно');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting supplier order:', error);
      alert('Ошибка при удалении заказа у поставщика');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Клиенты и детали клиента */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:[grid-template-columns:1.3fr_2fr]">
        <div className="md:col-span-1 space-y-4">
          <Card variant="base">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-black flex items-center"><Users className="h-5 w-5 mr-2"/>Клиенты</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateClientForm(true)}
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
            <div className="p-4">
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по ФИО, телефону, адресу..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black/50"
                />
              </div>
            </div>
            <div className="p-0">
              <div className="divide-y">
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClient(c.id)}
                    className={`w-full text-left p-4 hover:bg-gray-50 ${selectedClient===c.id?'bg-blue-50':''}`}
                  >
                    <div className="grid items-center gap-4" style={{gridTemplateColumns:'8fr 4fr'}}>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.lastName} {c.firstName}{c.middleName?` ${c.middleName}`:''}</div>
                        <div className="text-xs text-gray-600 truncate">{c.address||'—'}</div>
                      </div>
                      <div className="text-xs text-gray-600 truncate flex items-center"><Phone className="h-3.5 w-3.5 mr-1"/>{formatPhone(c.phone||'')}</div>
                    </div>
                    {/* Убрали "последний документ" для компактности */}
                  </button>
                ))}
                {clients.length===0 && (
                  <div className="p-4 text-sm text-gray-500">Нет клиентов</div>
                )}
              </div>
            </div>
          </Card>
      </div>

        <div className="md:col-span-1">
          <Card variant="base">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              {selectedClient ? (
                <div className="min-w-0">
                  {(() => {
                    const c = clients.find(x => x.id===selectedClient);
                    if (!c) return null;
                    return (
                      <>
                        <div className="font-semibold text-black truncate">{c.lastName} {c.firstName}{c.middleName?` ${c.middleName}`:''}</div>
                        <div className="text-sm text-gray-600 truncate flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-1"/>{formatPhone(c.phone||'')}<span className="mx-2">•</span>Адрес: {c.address||'—'}
                        </div>
                      </>
                    );
                  })()}
        </div>
              ) : (
                <div className="text-gray-600">Выберите клиента слева</div>
              )}
            </div>

            {selectedClient && (
              <div className="p-4">
                <div className="border-b border-gray-200 mb-4">
                  <nav className="-mb-px flex space-x-6">
                    {([
                      {id:'invoices',name:'Счета',icon:Download},
                      {id:'supplier_orders',name:'Заказ у поставщика',icon:Package}
                    ] as Array<{id:'invoices'|'supplier_orders';name:string;icon:any}>).map((t) => (
            <button
                        key={t.id}
                        onClick={() => setClientTab(t.id)}
                        className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${clientTab===t.id?'border-black text-black':'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      >
                        <t.icon className="h-4 w-4 mr-2"/>{t.name}
            </button>
          ))}
        </nav>
      </div>

                {clientTab==='invoices' && (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {(['all','Черновик','Отправлен','Оплачен/Заказ','Отменен','В производстве','Получен от поставщика','Исполнен'] as const).map(s => (
                        <button key={s}
                          onClick={() => setInvoicesFilter(s)}
                          className={`px-3 py-1 text-sm border ${invoicesFilter===s?'border-black bg-black text-white':'border-gray-300 hover:border-black'}`}
                        >{s==='all'?'Все':s}</button>
                      ))}
          </div>
                    <div className="space-y-2">
                      {invoices.filter(i => invoicesFilter==='all' || i.status===invoicesFilter).map(i => (
                        <div key={i.id} className="border border-gray-200 p-3 hover:border-black transition-colors">
          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="font-medium text-black">{i.number}</div>
                                <div className="text-sm text-gray-600">от {i.date}{i.dueAt?` • оплатить до ${i.dueAt}`:''}</div>
                                <button
                                  onClick={(e) => showStatusDropdown('invoice', i.id, e)}
                                  className={`inline-block px-2 py-0.5 text-xs rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${badgeByInvoiceStatus(i.status)}`}
                                >
                                  {i.status}
                                </button>
                              </div>
          </div>
                            <div className="text-right ml-4 flex items-center space-x-2">
                              <div className="font-semibold text-black">{i.total.toLocaleString('ru-RU')} ₽</div>
                              <div className="relative" data-invoice-actions>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowInvoiceActions(showInvoiceActions === i.id ? null : i.id);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-400" />
                                </button>
                                
                                {showInvoiceActions === i.id && (
                                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        createSupplierOrderFromInvoice(i.id);
                                        setShowInvoiceActions(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                                    >
                                      Заказ у поставщика
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        createInvoiceFromInvoice(i.id);
                                        setShowInvoiceActions(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                                    >
                                      Создать счет
                                    </button>
                                    <hr className="my-1" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteInvoice(i.id);
                                        setShowInvoiceActions(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                  </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <button className="hover:text-black flex items-center"><StickyNote className="h-3.5 w-3.5 mr-1"/>Комментарии</button>
                              <button className="hover:text-black flex items-center"><History className="h-3.5 w-3.5 mr-1"/>История</button>
                  </div>
                </div>
                      </div>
                    ))}
                      {invoices.filter(i => invoicesFilter==='all' || i.status===invoicesFilter).length===0 && (
                        <div className="text-sm text-gray-500">Нет счетов по выбранному фильтру</div>
                      )}
                </div>
                  </>
                )}

                {clientTab==='supplier_orders' && (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {(['all','Черновик','Отправлен','В производстве','Получен от поставщика','Исполнен'] as const).map(s => (
                        <button key={s}
                          onClick={() => setSupplierOrdersFilter(s)}
                          className={`px-3 py-1 text-sm border ${supplierOrdersFilter===s?'border-black bg-black text-white':'border-gray-300 hover:border-black'}`}
                        >{s==='all'?'Все':s}</button>
                      ))}
          </div>
                    <div className="space-y-2">
                      {supplierOrders.filter(so => supplierOrdersFilter==='all' || so.status===supplierOrdersFilter).map(so => (
                        <div key={so.id} className="border border-gray-200 p-3 hover:border-black transition-colors">
              <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="font-medium text-black">{so.number}</div>
                                <div className="text-sm text-gray-600">от {so.date}</div>
                                <button
                                  onClick={(e) => showStatusDropdown('supplier_order', so.id, e)}
                                  className={`inline-block px-2 py-0.5 text-xs rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${badgeBySupplierOrderStatus(so.status)}`}
                                >
                                  {so.status}
                                </button>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {so.supplierName && <span>Поставщик: {so.supplierName}</span>}
                  </div>
                </div>
                            <div className="text-right ml-4 flex items-center space-x-2">
                              <div className="font-semibold text-black">{so.total.toLocaleString('ru-RU')} ₽</div>
                              <div className="relative" data-supplier-order-actions>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowSupplierOrderActions(showSupplierOrderActions === so.id ? null : so.id);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <MoreVertical className="h-4 w-4 text-gray-400" />
                                </button>
                                
                                {showSupplierOrderActions === so.id && (
                                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        generateSupplierOrderExcel(so.id);
                                        setShowSupplierOrderActions(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                                    >
                                      Скачать Excel
                                    </button>
                                    <hr className="my-1" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSupplierOrder(so.id);
                                        setShowSupplierOrderActions(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <button className="hover:text-black flex items-center"><StickyNote className="h-3.5 w-3.5 mr-1"/>Комментарии</button>
                              <button className="hover:text-black flex items-center"><History className="h-3.5 w-3.5 mr-1"/>История</button>
                            </div>
                </div>
              </div>
            ))}
                      {supplierOrders.filter(so => supplierOrdersFilter==='all' || so.status===supplierOrdersFilter).length===0 && (
                        <div className="text-sm text-gray-500">Нет заказов у поставщика по выбранному фильтру</div>
                      )}
          </div>
                  </>
                )}
        </div>
      )}
          </Card>
        </div>
      </div>

      {/* Модальное окно создания клиента */}
      {showCreateClientForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Новый заказчик</h3>
              <button
                onClick={() => setShowCreateClientForm(false)}
                className="px-3 py-2 text-sm border border-black text-black hover:bg-black hover:text-white rounded"
              >
                Закрыть
              </button>
            </div>

            {/* Одна строка с полями разной ширины */}
            <div className="grid grid-cols-12 gap-3">
              <input
                type="text"
                placeholder="Фамилия"
                value={newClientData.lastName}
                onChange={(e) => setNewClientData(prev => ({ ...prev, lastName: e.target.value }))}
                className="col-span-3 px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder="Имя"
                value={newClientData.firstName}
                onChange={(e) => setNewClientData(prev => ({ ...prev, firstName: e.target.value }))}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder="Отчество"
                value={newClientData.middleName}
                onChange={(e) => setNewClientData(prev => ({ ...prev, middleName: e.target.value }))}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="tel"
                placeholder="Телефон"
                value={newClientData.phone}
                onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                className="col-span-2 px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder="ID объекта"
                value={newClientData.objectId}
                onChange={(e) => setNewClientData(prev => ({ ...prev, objectId: e.target.value }))}
                className="col-span-3 px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder="Адрес"
                value={newClientData.address}
                onChange={(e) => setNewClientData(prev => ({ ...prev, address: e.target.value }))}
                className="col-span-12 px-3 py-2 border border-gray-300 rounded"
              />
                </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCreateClientForm(false)}
                className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (!newClientData.firstName || !newClientData.lastName || !newClientData.phone) {
                    alert('Заполните ФИО и телефон');
                    return;
                  }
                  try {
                    await createClient(newClientData);
                  } catch (error) {
                    console.error('Error creating client:', error);
                  }
                }}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Создать клиента
              </button>
              </div>
          </div>
        </div>
      )}

      {/* Выпадающее меню статуса */}
      {statusDropdown && (
        <div 
          className="fixed z-50 bg-white border border-gray-300 rounded-xl shadow-xl py-2 min-w-[160px] backdrop-blur-sm"
          style={{ 
            left: statusDropdown.x, 
            top: statusDropdown.y 
          }}
          data-status-dropdown
        >
          {statusDropdown.type === 'invoice' && (
            <>
              {statusDropdown.id && (() => {
                const invoice = invoices.find(i => i.id === statusDropdown!.id);
                if (!invoice) return null;
                
                const getAllStatuses = () => {
                  return ['Черновик', 'Отправлен', 'Оплачен/Заказ', 'Отменен'];
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
                const supplierOrder = supplierOrders.find(so => so.id === statusDropdown!.id);
                if (!supplierOrder) return null;
                
                const getAllStatuses = () => {
                  return ['Черновик', 'Отправлен', 'В производстве', 'Получен от поставщика', 'Исполнен'];
                };
                
                const allStatuses = getAllStatuses();
                
                return allStatuses.map((status, index) => (
                  <div key={status}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Здесь можно добавить логику изменения статуса заказа у поставщика
                        console.log('Status clicked:', { supplierOrderId: supplierOrder.id, status });
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200 ${
                        supplierOrder.status === status 
                          ? 'bg-blue-50 text-blue-700 font-medium' 
                          : 'hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{status}</span>
                        {supplierOrder.status === status && (
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
    </div>
  );
}