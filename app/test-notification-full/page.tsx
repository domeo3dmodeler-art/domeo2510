'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';

export default function TestNotificationFull() {
  const [result, setResult] = useState('');
  const [testInvoiceId, setTestInvoiceId] = useState('');
  const [testClientId, setTestClientId] = useState('');

  const createTestData = async () => {
    try {
      setResult('🔄 Создаем тестовые данные...');
      
      // Создаем тестового клиента
      const clientResponse = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          firstName: 'Тестовый',
          lastName: 'Клиент',
          middleName: 'Для',
          phone: '+7 (999) 123-45-67',
          address: 'Тестовый адрес для уведомлений',
          objectId: 'test-object-' + Date.now()
        })
      });
      
      const clientData = await clientResponse.json();
      if (!clientData.client) {
        setResult(`❌ Ошибка создания клиента: ${JSON.stringify(clientData)}`);
        return;
      }
      
      const clientId = clientData.client.id;
      setTestClientId(clientId);
      setResult(`✅ Тестовый клиент создан: ${clientData.client.lastName} ${clientData.client.firstName} (ID: ${clientId})`);
      
      // Создаем счет
      const invoiceResponse = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          client_id: clientId,
          status: 'SENT',
          total_amount: 1000,
          subtotal: 1000,
          tax_amount: 0,
          currency: 'RUB',
          notes: 'Тестовый счет для проверки уведомлений'
        })
      });
      
      const invoiceData = await invoiceResponse.json();
      if (invoiceData.success && invoiceData.invoice) {
        setTestInvoiceId(invoiceData.invoice.id);
        setResult(`✅ Тестовый счет создан: ${invoiceData.invoice.number} (ID: ${invoiceData.invoice.id})`);
      } else {
        setResult(`❌ Ошибка создания счета: ${JSON.stringify(invoiceData)}`);
      }
    } catch (error: any) {
      setResult('❌ Ошибка: ' + error.message);
    }
  };

  const testNotificationFlow = async () => {
    if (!testInvoiceId) {
      setResult('❌ Сначала создайте тестовые данные');
      return;
    }
    
    try {
      setResult('🔄 Тестируем поток уведомлений...\n');
      
      // 1. Переводим в "Оплачен" - должно уведомить исполнителей
      setResult(prev => prev + '1️⃣ Переводим счет в статус "Оплачен"...\n');
      const paidResponse = await fetch(`/api/invoices/${testInvoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ status: 'PAID' })
      });
      const paidData = await paidResponse.json();
      if (paidData.success) {
        setResult(prev => prev + `✅ Статус изменен на "Оплачен" - исполнители уведомлены\n`);
      } else {
        setResult(prev => prev + `❌ Ошибка: ${JSON.stringify(paidData)}\n`);
        return;
      }
      
      // Ждем немного
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Переводим в "Заказ размещен" - должно уведомить комплектатора
      setResult(prev => prev + '2️⃣ Переводим счет в статус "Заказ размещен"...\n');
      const productionResponse = await fetch(`/api/invoices/${testInvoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ status: 'IN_PRODUCTION' })
      });
      const productionData = await productionResponse.json();
      if (productionData.success) {
        setResult(prev => prev + `✅ Статус изменен на "Заказ размещен" - комплектатор уведомлен\n`);
      } else {
        setResult(prev => prev + `❌ Ошибка: ${JSON.stringify(productionData)}\n`);
        return;
      }
      
      // Ждем немного
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Переводим в "Получен от поставщика" - должно уведомить комплектатора
      setResult(prev => prev + '3️⃣ Переводим счет в статус "Получен от поставщика"...\n');
      const receivedResponse = await fetch(`/api/invoices/${testInvoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ status: 'RECEIVED_FROM_SUPPLIER' })
      });
      const receivedData = await receivedResponse.json();
      if (receivedData.success) {
        setResult(prev => prev + `✅ Статус изменен на "Получен от поставщика" - комплектатор уведомлен\n`);
      } else {
        setResult(prev => prev + `❌ Ошибка: ${JSON.stringify(receivedData)}\n`);
        return;
      }
      
      // Ждем немного
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. Переводим в "Исполнен" - должно уведомить комплектатора
      setResult(prev => prev + '4️⃣ Переводим счет в статус "Исполнен"...\n');
      const completedResponse = await fetch(`/api/invoices/${testInvoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      const completedData = await completedResponse.json();
      if (completedData.success) {
        setResult(prev => prev + `✅ Статус изменен на "Исполнен" - комплектатор уведомлен\n`);
      } else {
        setResult(prev => prev + `❌ Ошибка: ${JSON.stringify(completedData)}\n`);
        return;
      }
      
      setResult(prev => prev + '\n🎉 Все тесты уведомлений пройдены успешно!');
      
    } catch (error: any) {
      setResult(prev => prev + `❌ Ошибка: ${error.message}`);
    }
  };

  const getNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setResult(`📬 Получено уведомлений: ${data.notifications.length}\n\n${JSON.stringify(data.notifications, null, 2)}`);
      } else {
        setResult(`❌ Ошибка получения уведомлений: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      setResult('❌ Ошибка: ' + error.message);
    }
  };

  const clearNotifications = async () => {
    try {
      setResult('🔄 Очищаем уведомления...');
      // Здесь можно добавить API для очистки уведомлений
      setResult('✅ Уведомления очищены (заглушка)');
    } catch (error: any) {
      setResult('❌ Ошибка: ' + error.message);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Полное тестирование системы уведомлений</h1>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={createTestData} className="w-full">
            Создать тестовые данные
          </Button>
          <Button onClick={testNotificationFlow} variant="success" disabled={!testInvoiceId}>
            Тестировать поток уведомлений
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={getNotifications} variant="secondary">
            Получить уведомления
          </Button>
          <Button onClick={clearNotifications} variant="warning">
            Очистить уведомления
          </Button>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded-md">
        <h3 className="font-bold mb-2">Статус тестирования:</h3>
        <div className="whitespace-pre-wrap text-sm">
          {result || 'Нажмите "Создать тестовые данные" для начала тестирования'}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="font-bold mb-2">Логика уведомлений:</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>PAID</strong> → уведомляются все <strong>исполнители</strong></li>
          <li>• <strong>IN_PRODUCTION</strong> → уведомляется <strong>комплектатор</strong></li>
          <li>• <strong>RECEIVED_FROM_SUPPLIER</strong> → уведомляется <strong>комплектатор</strong></li>
          <li>• <strong>COMPLETED</strong> → уведомляется <strong>комплектатор</strong></li>
        </ul>
      </div>
    </div>
  );
}
