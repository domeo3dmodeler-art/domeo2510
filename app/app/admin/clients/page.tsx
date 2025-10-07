'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Modal, Alert, LoadingSpinner } from '@/components/ui';
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
  _count: {
    quotes: number;
    invoices: number;
    orders: number;
    documents: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    address: '',
    objectId: '',
    customFields: {} as Record<string, any>
  });

  useEffect(() => {
    fetchClients();
  }, [pagination.page, search]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search })
      });

      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();

      if (data.success) {
        setClients(data.clients);
        setPagination(data.pagination);
      } else {
        setAlert({ type: 'error', message: 'Ошибка загрузки заказчиков' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка загрузки заказчиков' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Заказчик создан успешно' });
        setShowCreateModal(false);
        resetForm();
        fetchClients();
      } else {
        setAlert({ type: 'error', message: data.error || 'Ошибка создания заказчика' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка создания заказчика' });
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;

    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Заказчик обновлен успешно' });
        setEditingClient(null);
        resetForm();
        fetchClients();
      } else {
        setAlert({ type: 'error', message: data.error || 'Ошибка обновления заказчика' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка обновления заказчика' });
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Удалить заказчика? Это действие нельзя отменить.')) return;

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setAlert({ type: 'success', message: 'Заказчик удален успешно' });
        fetchClients();
      } else {
        setAlert({ type: 'error', message: data.error || 'Ошибка удаления заказчика' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка удаления заказчика' });
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      middleName: '',
      phone: '',
      address: '',
      objectId: '',
      customFields: {}
    });
  };

  const openEditModal = (client: Client) => {
    setFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      middleName: client.middleName || '',
      phone: client.phone,
      address: client.address,
      objectId: client.objectId,
      customFields: client.customFields
    });
    setEditingClient(client);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingClient(null);
    setShowCreateModal(true);
  };

  if (loading && clients.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" color="black" text="Загрузка заказчиков..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Заказчики</h1>
            <p className="text-gray-600 mt-2">Управление заказчиками и их документами</p>
          </div>
          <Button onClick={openCreateModal} variant="primary">
            Добавить заказчика
          </Button>
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

        {/* Search */}
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Поиск по имени, телефону или адресу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Clients List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card key={client.id} variant="base" padding="md">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {client.lastName} {client.firstName} {client.middleName}
                  </h3>
                  <p className="text-sm text-gray-600">{client.phone}</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(client)}
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClient(client.id)}
                  >
                    🗑️
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Адрес:</strong> {client.address}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>ID объекта:</strong> {client.objectId}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{client._count.quotes}</div>
                  <div className="text-sm text-gray-600">КП</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{client._count.invoices}</div>
                  <div className="text-sm text-gray-600">Счета</div>
                </div>
              </div>

              <div className="flex justify-between">
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Подробнее →
                </Link>
                <span className={`px-2 py-1 rounded text-xs ${
                  client.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {client.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                ←
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {pagination.page} из {pagination.pages}
              </span>
              <Button
                variant="ghost"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
              >
                →
              </Button>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showCreateModal || editingClient !== null}
          onClose={() => {
            setShowCreateModal(false);
            setEditingClient(null);
            resetForm();
          }}
          title={editingClient ? 'Редактировать заказчика' : 'Добавить заказчика'}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Фамилия *
                </label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Иванов"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя *
                </label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Иван"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Отчество
              </label>
              <Input
                value={formData.middleName}
                onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
                placeholder="Иванович"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон *
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Адрес объекта *
              </label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="г. Москва, ул. Примерная, д. 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID объекта *
              </label>
              <Input
                value={formData.objectId}
                onChange={(e) => setFormData(prev => ({ ...prev, objectId: e.target.value }))}
                placeholder="OBJ-001"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingClient(null);
                  resetForm();
                }}
              >
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={editingClient ? handleUpdateClient : handleCreateClient}
                disabled={!formData.firstName || !formData.lastName || !formData.phone || !formData.address || !formData.objectId}
              >
                {editingClient ? 'Обновить' : 'Создать'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

