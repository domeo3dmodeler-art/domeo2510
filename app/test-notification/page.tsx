'use client';

import { useState } from 'react';

export default function TestNotificationPage() {
  const [result, setResult] = useState('');

  const createNotification = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          userId: 'cmg5jnn3x000212qseorch5oc',
          type: 'invoice_paid',
          title: 'Счет оплачен',
          message: 'Счет №INV-007 переведен в статус Оплачен/Заказ. Требуется обработка исполнителем.'
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Ошибка: ' + error.message);
    }
  };

  const getNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Ошибка: ' + error.message);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Тест создания уведомлений</h1>
      <div className="space-x-4 mb-4">
        <button 
          onClick={createNotification}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Создать уведомление
        </button>
        <button 
          onClick={getNotifications}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
