'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input, Modal, Alert, LoadingSpinner } from '@/components/ui';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  address: string;
  objectId: string;
}

interface ClientSelectorProps {
  onClientSelect: (client: Client) => void;
  onClose: () => void;
}

export default function ClientSelector({ onClientSelect, onClose }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '50',
        ...(search && { search })
      });

      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();

      if (data.success) {
        setClients(data.clients);
      } else {
        setAlert({ type: 'error', message: 'Ошибка загрузки заказчиков' });
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'Ошибка загрузки заказчиков' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchClients();
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleConfirm = () => {
    if (selectedClient) {
      onClientSelect(selectedClient);
      onClose();
    }
  };

  const handleCreateNew = () => {
    // Открываем модальное окно создания нового заказчика
    // Это можно реализовать позже
    setAlert({ type: 'error', message: 'Создание нового заказчика будет доступно позже' });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Выберите заказчика"
      size="lg"
    >
      <div className="space-y-4">
        {/* Alert */}
        {alert && (
          <Alert
            variant={alert.type}
            onClose={() => setAlert(null)}
          >
            {alert.message}
          </Alert>
        )}

        {/* Search */}
        <div className="flex space-x-3">
          <Input
            type="text"
            placeholder="Поиск по имени, телефону или адресу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button variant="primary" onClick={handleSearch}>
            Поиск
          </Button>
        </div>

        {/* Clients List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" color="black" text="Загрузка заказчиков..." />
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {clients.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Заказчики не найдены
                </h3>
                <p className="text-gray-600 mb-4">
                  {search ? 'Попробуйте изменить поисковый запрос' : 'Создайте первого заказчика'}
                </p>
                <Button variant="primary" onClick={handleCreateNew}>
                  Создать заказчика
                </Button>
              </div>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedClient?.id === client.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleClientSelect(client)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {client.lastName} {client.firstName} {client.middleName}
                      </h4>
                      <p className="text-sm text-gray-600">{client.phone}</p>
                      <p className="text-sm text-gray-600">{client.address}</p>
                      <p className="text-xs text-gray-500">ID: {client.objectId}</p>
                    </div>
                    {selectedClient?.id === client.id && (
                      <div className="text-blue-500">
                        ✓
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={handleCreateNew}>
              Создать нового
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!selectedClient}
            >
              Выбрать
            </Button>
          </div>
        </div>

        {/* Selected Client Info */}
        {selectedClient && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Выбранный заказчик:</h4>
            <p className="text-sm text-blue-800">
              {selectedClient.lastName} {selectedClient.firstName} {selectedClient.middleName}
            </p>
            <p className="text-sm text-blue-800">{selectedClient.phone}</p>
            <p className="text-sm text-blue-800">{selectedClient.address}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

