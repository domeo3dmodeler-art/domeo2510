'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Alert, LoadingSpinner } from '@/components/ui';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  address: string;
  objectId: string;
  customFields: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  quotes: any[];
  invoices: any[];
  orders: any[];
  documents: any[];
  _count: {
    quotes: number;
    invoices: number;
    orders: number;
    documents: number;
  };
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'quotes' | 'invoices' | 'orders'>('documents');

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (data.success) {
        setClient(data.client);
      } else {
        setAlert({ type: 'error', message: 'Ошибка загрузки заказчика' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка загрузки заказчика' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (type: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: {
            clientId,
            type,
            items: [],
            total: 0
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Документ создан успешно' });
        fetchClient();
      } else {
        setAlert({ type: 'error', message: data.error || 'Ошибка создания документа' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка создания документа' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" color="black" text="Загрузка заказчика..." />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Заказчик не найден</h1>
          <Link href="/admin/clients" className="text-blue-600 hover:text-blue-800">
            ← Вернуться к списку заказчиков
          </Link>
        </div>
      </div>
    );
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'quote': return 'КП';
      case 'invoice': return 'Счет';
      case 'order': return 'Заказ';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'sent': return 'Отправлен';
      case 'paid': return 'Оплачен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin/clients" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Вернуться к списку заказчиков
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {client.lastName} {client.firstName} {client.middleName}
            </h1>
            <p className="text-gray-600 mt-2">Информация о заказчике и его документах</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => handleCreateDocument('quote')}
            >
              Создать КП
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCreateDocument('invoice')}
            >
              Создать счет
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCreateDocument('order')}
            >
              Создать заказ
            </Button>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client Info */}
          <div className="lg:col-span-1">
            <Card variant="base" padding="md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация о заказчике</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Телефон</label>
                  <p className="text-sm text-gray-900">{client.phone}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Адрес объекта</label>
                  <p className="text-sm text-gray-900">{client.address}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID объекта</label>
                  <p className="text-sm text-gray-900">{client.objectId}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    client.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {client.isActive ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата создания</label>
                  <p className="text-sm text-gray-900">
                    {new Date(client.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            </Card>

            {/* Statistics */}
            <Card variant="base" padding="md" className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{client._count.quotes}</div>
                  <div className="text-sm text-gray-600">КП</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{client._count.invoices}</div>
                  <div className="text-sm text-gray-600">Счета</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{client._count.orders}</div>
                  <div className="text-sm text-gray-600">Заказы</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{client._count.documents}</div>
                  <div className="text-sm text-gray-600">Всего</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Documents */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'documents'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Все документы
              </button>
              <button
                onClick={() => setActiveTab('quotes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'quotes'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                КП ({client._count.quotes})
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'invoices'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Счета ({client._count.invoices})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeTab === 'orders'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Заказы ({client._count.orders})
              </button>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              {(() => {
                let documents = client.documents;
                
                switch (activeTab) {
                  case 'quotes':
                    documents = documents.filter(doc => doc.type === 'quote');
                    break;
                  case 'invoices':
                    documents = documents.filter(doc => doc.type === 'invoice');
                    break;
                  case 'orders':
                    documents = documents.filter(doc => doc.type === 'order');
                    break;
                  default:
                    documents = client.documents;
                }

                if (documents.length === 0) {
                  return (
                    <Card variant="base" padding="md">
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">📄</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Документы не найдены
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {activeTab === 'documents' 
                            ? 'У этого заказчика пока нет документов'
                            : `У этого заказчика пока нет документов типа "${getDocumentTypeLabel(activeTab)}"`
                          }
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => handleCreateDocument(activeTab === 'documents' ? 'quote' : activeTab)}
                        >
                          Создать {activeTab === 'documents' ? 'документ' : getDocumentTypeLabel(activeTab)}
                        </Button>
                      </div>
                    </Card>
                  );
                }

                return documents.map((document) => (
                  <Card key={document.id} variant="base" padding="md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {getDocumentTypeLabel(document.type)} #{document.id.slice(-8)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Создан: {new Date(document.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                          {getStatusLabel(document.status)}
                        </span>
                        <Button variant="ghost" size="sm">
                          Открыть
                        </Button>
                      </div>
                    </div>
                  </Card>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

