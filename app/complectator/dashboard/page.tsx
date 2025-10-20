'use client';

import React, { useState, useEffect } from 'react';
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
  Plus
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
// Убраны корзина/генераторы документов для режима работы с клиентами

interface ComplectatorStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

export default function ComplectatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ComplectatorStats | null>(null);
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
    lastDoc?: { type: 'quote'|'invoice'; status: string; id: string; date: string; total?: number };
  }>>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientTab, setClientTab] = useState<'quotes'|'invoices'>('quotes');
  const [quotes, setQuotes] = useState<Array<{ id: string; number: string; date: string; status: 'Черновик'|'Отправлено'|'Согласовано'|'Отказ'; total: number }>>([]);
  const [invoices, setInvoices] = useState<Array<{ id: string; number: string; date: string; status: 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'; total: number; dueAt?: string }>>([]);
  const [quotesFilter, setQuotesFilter] = useState<'all'|'Черновик'|'Отправлено'|'Согласовано'|'Отказ'>('all');
  const [invoicesFilter, setInvoicesFilter] = useState<'all'|'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'>('all');
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

  useEffect(() => {
    fetchStats();
    fetchClients();
  }, []);

  // Загрузка списка клиентов
  const fetchClients = async () => {
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
  };

  // Загрузка документов клиента
  const fetchClientDocuments = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        const client = data.client;
        
        // Преобразуем КП
        const formattedQuotes = client.quotes.map((quote: any) => ({
          id: quote.id,
          number: quote.number ? quote.number.replace('QUOTE-', 'КП-') : `КП-${quote.id.slice(-6)}`,
          date: new Date(quote.created_at).toISOString().split('T')[0],
          status: mapQuoteStatus(quote.status),
          total: Number(quote.total_amount) || 0
        }));
        setQuotes(formattedQuotes);
        
        // Преобразуем Счета
        const formattedInvoices = client.invoices.map((invoice: any) => ({
          id: invoice.id,
          number: invoice.number ? invoice.number.replace('INVOICE-', 'СЧ-') : `СЧ-${invoice.id.slice(-6)}`,
          date: new Date(invoice.created_at).toISOString().split('T')[0],
          status: mapInvoiceStatus(invoice.status),
          total: Number(invoice.total_amount) || 0,
          dueAt: invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : undefined
        }));
        setInvoices(formattedInvoices);
      } else {
        console.error('Failed to fetch client documents');
      }
    } catch (error) {
      console.error('Error fetching client documents:', error);
    }
  };

  // Маппинг статусов КП из API в русские
  const mapQuoteStatus = (apiStatus: string): 'Черновик'|'Отправлено'|'Согласовано'|'Отказ' => {
    const statusMap: Record<string, 'Черновик'|'Отправлено'|'Согласовано'|'Отказ'> = {
      'DRAFT': 'Черновик',
      'SENT': 'Отправлено',
      'ACCEPTED': 'Согласовано',
      'REJECTED': 'Отказ'
    };
    return statusMap[apiStatus] || 'Черновик';
  };

  // Маппинг статусов Счетов из API в русские
  const mapInvoiceStatus = (apiStatus: string): 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен' => {
    const statusMap: Record<string, 'Черновик'|'Отправлен'|'Оплачен/Заказ'|'Отменен'|'В производстве'|'Получен от поставщика'|'Исполнен'> = {
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

  const badgeByQuoteStatus = (s: 'Черновик'|'Отправлено'|'Согласовано'|'Отказ') => {
    switch (s) {
      case 'Черновик': return 'border-gray-300 text-gray-700';
      case 'Отправлено': return 'border-blue-300 text-blue-700';
      case 'Согласовано': return 'border-green-300 text-green-700';
      case 'Отказ': return 'border-red-300 text-red-700';
    }
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

  const isTerminalDoc = (doc?: { type: 'quote'|'invoice'; status: string }) => {
    if (!doc) return false;
    if (doc.type === 'quote') {
      return doc.status === 'Согласовано' || doc.status === 'Отказ';
    }
    // invoice
    return doc.status === 'Исполнен' || doc.status === 'Отменен';
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

  // Изменение статуса КП
  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      // Маппинг русских статусов на английские для API
      const statusMap: Record<string, string> = {
        'Черновик': 'DRAFT',
        'Отправлено': 'SENT', 
        'Согласовано': 'ACCEPTED',
        'Отказ': 'REJECTED'
      };
      
      const apiStatus = statusMap[newStatus] || newStatus;
      
      const response = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: apiStatus })
      });

      if (response.ok) {
        const result = await response.json();
        // Маппинг обратно на русские статусы
        const reverseStatusMap: Record<string, string> = {
          'DRAFT': 'Черновик',
          'SENT': 'Отправлено',
          'ACCEPTED': 'Согласовано', 
          'REJECTED': 'Отказ'
        };
        
        const russianStatus = reverseStatusMap[result.quote.status] || result.quote.status;
        
        // Обновляем список КП
        setQuotes(prev => prev.map(q => 
          q.id === quoteId ? { 
            ...q, 
            status: russianStatus as any
          } : q
        ));
        return result.quote;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при изменении статуса КП');
      }
    } catch (error) {
      console.error('Error updating quote status:', error);
      alert('Ошибка при изменении статуса КП');
      throw error;
    }
  };

  // Изменение статуса Счета (заглушка)
  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      // TODO: Реализовать API для изменения статуса счета
      console.log(`Updating invoice ${invoiceId} status to ${newStatus}`);
      
      // Пока просто обновляем локальное состояние
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus as any } : inv
      ));
      
      alert(`Статус счета изменен на "${newStatus}" (заглушка)`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('Ошибка при изменении статуса счета');
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
                {clients
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
                  })
                  .map(c => (
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
                      {id:'quotes',name:'КП',icon:FileText},
                      {id:'invoices',name:'Счета',icon:Download}
                    ] as Array<{id:'quotes'|'invoices';name:string;icon:any}>).map((t) => (
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

                {clientTab==='quotes' && (
                  <>
                    <div className="mb-3 flex items-center space-x-2">
                      {(['all','Черновик','Отправлено','Согласовано','Отказ'] as const).map(s => (
                        <button key={s}
                          onClick={() => setQuotesFilter(s)}
                          className={`px-3 py-1 text-sm border ${quotesFilter===s?'border-black bg-black text-white':'border-gray-300 hover:border-black'}`}
                        >{s==='all'?'Все':s}</button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {quotes.filter(q => quotesFilter==='all' || q.status===quotesFilter).map(q => (
                        <div key={q.id} className="border border-gray-200 p-3 hover:border-black transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-black">{q.number}</div>
                              <div className="text-sm text-gray-600">от {q.date}</div>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${badgeByQuoteStatus(q.status)}`}>{q.status}</span>
                              <div className="font-semibold text-black mt-1">{q.total.toLocaleString('ru-RU')} ₽</div>
                            </div>
        </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <button className="hover:text-black flex items-center"><StickyNote className="h-3.5 w-3.5 mr-1"/>Комментарии</button>
                              <button className="hover:text-black flex items-center"><History className="h-3.5 w-3.5 mr-1"/>История</button>
                            </div>
                            <div className="flex items-center gap-1">
                              {q.status === 'Черновик' && (
                                <button
                                  onClick={() => updateQuoteStatus(q.id, 'sent')}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                  Отправить
                                </button>
                              )}
                              {q.status === 'Отправлено' && (
                                <>
                                  <button
                                    onClick={() => updateQuoteStatus(q.id, 'accepted')}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                  >
                                    Согласовать
                                  </button>
                                  <button
                                    onClick={() => updateQuoteStatus(q.id, 'rejected')}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                  >
                                    Отказ
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
          </div>
                      ))}
                      {quotes.filter(q => quotesFilter==='all' || q.status===quotesFilter).length===0 && (
                        <div className="text-sm text-gray-500">Нет КП по выбранному фильтру</div>
                      )}
        </div>
                  </>
                )}

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
                <div>
                              <div className="font-medium text-black">{i.number}</div>
                              <div className="text-sm text-gray-600">от {i.date}{i.dueAt?` • оплатить до ${i.dueAt}`:''}</div>
                </div>
                <div className="text-right">
                              <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${badgeByInvoiceStatus(i.status)}`}>{i.status}</span>
                              <div className="font-semibold text-black mt-1">{i.total.toLocaleString('ru-RU')} ₽</div>
                </div>
              </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <button className="hover:text-black flex items-center"><StickyNote className="h-3.5 w-3.5 mr-1"/>Комментарии</button>
                              <button className="hover:text-black flex items-center"><History className="h-3.5 w-3.5 mr-1"/>История</button>
                            </div>
                            <div className="flex items-center gap-1">
                              {i.status === 'Черновик' && (
                                <button
                                  onClick={() => updateInvoiceStatus(i.id, 'Отправлен')}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                >
                                  Отправить
                                </button>
                              )}
                              {i.status === 'Отправлен' && (
                                <button
                                  onClick={() => updateInvoiceStatus(i.id, 'Оплачен/Заказ')}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                >
                                  Оплачен
                                </button>
                              )}
                              {i.status === 'Оплачен/Заказ' && (
                                <button
                                  onClick={() => updateInvoiceStatus(i.id, 'В производстве')}
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                                >
                                  В производство
                                </button>
                              )}
                              {i.status === 'В производстве' && (
                                <button
                                  onClick={() => updateInvoiceStatus(i.id, 'Получен от поставщика')}
                                  className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                >
                                  Получен
                                </button>
                              )}
                              {i.status === 'Получен от поставщика' && (
                                <button
                                  onClick={() => updateInvoiceStatus(i.id, 'Исполнен')}
                                  className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                                >
                                  Исполнен
                                </button>
                              )}
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
    </div>
  );
}
