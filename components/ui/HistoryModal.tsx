'use client';

import React, { useState, useEffect } from 'react';
import { History, Clock, User, ArrowRight } from 'lucide-react';

interface HistoryEntry {
  id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  details?: string;
  created_at: string;
  user: {
    firstName: string;
    lastName: string;
    middleName?: string;
    role: string;
  };
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentType: 'quote' | 'invoice' | 'supplier_order';
  documentNumber: string;
}

export default function HistoryModal({
  isOpen,
  onClose,
  documentId,
  documentType,
  documentNumber
}: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, documentId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUserName = (user: HistoryEntry['user']) => {
    const lastName = user.lastName;
    const firstName = user.firstName.charAt(0) + '.';
    const middleName = user.middleName ? user.middleName.charAt(0) + '.' : '';
    return `${lastName} ${firstName}${middleName}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionDescription = (entry: HistoryEntry) => {
    const actionMap: Record<string, string> = {
      'status_change': 'Изменение статуса',
      'created': 'Создание документа',
      'updated': 'Обновление документа',
      'comment_added': 'Добавлен комментарий',
      'comment_edited': 'Изменен комментарий',
      'comment_deleted': 'Удален комментарий',
      'regenerated': 'Перегенерирован',
      'deleted': 'Удален'
    };

    return actionMap[entry.action] || entry.action;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'status_change':
        return <ArrowRight className="h-4 w-4 text-blue-600" />;
      case 'created':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'comment_added':
      case 'comment_edited':
      case 'comment_deleted':
        return <Clock className="h-4 w-4 text-purple-600" />;
      case 'regenerated':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'deleted':
        return <Clock className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      'DRAFT': 'Черновик',
      'SENT': 'Отправлен',
      'ACCEPTED': 'Согласован',
      'REJECTED': 'Отказ',
      'PAID': 'Оплачен',
      'CANCELLED': 'Отменен',
      'IN_PRODUCTION': 'В производстве',
      'RECEIVED_FROM_SUPPLIER': 'Получен от поставщика',
      'COMPLETED': 'Исполнен'
    };
    return statusMap[status] || status;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <History className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              История изменений - {documentType === 'quote' ? 'КП' : documentType === 'invoice' ? 'Счет' : 'Заказ у поставщика'} {documentNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* History List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2">Загрузка истории...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>История изменений пуста</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id} className="flex items-start space-x-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                      {getActionIcon(entry.action)}
                    </div>
                    {index < history.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {getActionDescription(entry)}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {formatUserName(entry.user)}
                      </span>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {entry.user.role}
                      </span>
                    </div>

                    {/* Status change details */}
                    {entry.action === 'status_change' && entry.old_value && entry.new_value && (
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                          {getStatusDisplayName(entry.old_value)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                          {getStatusDisplayName(entry.new_value)}
                        </span>
                      </div>
                    )}

                    {/* Comment details */}
                    {(entry.action === 'comment_added' || entry.action === 'comment_edited') && entry.details && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                        <span className="text-blue-800">
                          {entry.action === 'comment_added' ? 'Комментарий: ' : 'Изменен комментарий: '}
                        </span>
                        <span className="text-gray-700">
                          {JSON.parse(entry.details).comment_text || 'Комментарий'}
                        </span>
                      </div>
                    )}

                    {/* Other details */}
                    {entry.details && !entry.details.includes('comment_text') && (
                      <div className="mt-2 text-sm text-gray-600">
                        {entry.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
