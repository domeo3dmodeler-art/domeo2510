'use client';

import { useState } from 'react';

export default function TestNotificationBusinessLogic() {
  const [result, setResult] = useState('');
  const [testInvoiceId, setTestInvoiceId] = useState('');

  const createTestInvoice = async () => {
    try {
      // Сначала создаем тестового клиента
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
      setResult(`✅ Тестовый клиент создан: ${clientData.client.lastName} ${clientData.client.firstName} (ID: ${clientId})`);
      
      // Теперь создаем счет
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
    } catch (error) {
      setResult('❌ Ошибка: ' + error.message);
    }
  };

  const changeInvoiceStatus = async (status: string) => {
    if (!testInvoiceId) {
      setResult('❌ Сначала создайте тестовый счет');
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${testInvoiceId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({ status })
      });
      
      const data = await response.json();
      if (data.success) {
        setResult(`✅ Статус счета изменен на "${status}". Проверьте уведомления!`);
      } else {
        setResult(`❌ Ошибка изменения статуса: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      setResult('❌ Ошибка: ' + error.message);
    }
  };

  const getNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      setResult(`📬 Уведомления:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult('❌ Ошибка получения уведомлений: ' + error.message);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тест бизнес-логики уведомлений</h1>
      
      <div className="space-y-4 mb-4">
        <button 
          onClick={createTestInvoice}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Создать тестовый счет
        </button>
        
        <div className="space-x-2">
          <button 
            onClick={() => changeInvoiceStatus('PAID')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!testInvoiceId}
          >
            Перевести в "Оплачен" (уведомить исполнителей)
          </button>
          
          <button 
            onClick={() => changeInvoiceStatus('IN_PRODUCTION')}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            disabled={!testInvoiceId}
          >
            Перевести в "Заказ размещен" (уведомить комплектатора)
          </button>
        </div>
        
        <button 
          onClick={getNotifications}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Получить уведомления
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <pre className="whitespace-pre-wrap">{result}</pre>
      </div>
    </div>
  );
}
