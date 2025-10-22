'use client';

import { useState, useEffect } from 'react';
import { FileText, ArrowRight, ExternalLink } from 'lucide-react';

interface RelatedDocumentsProps {
  document: any;
}

export function RelatedDocuments({ document }: RelatedDocumentsProps) {
  const [relatedDocs, setRelatedDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (document) {
      fetchRelatedDocuments();
    }
  }, [document]);

  const fetchRelatedDocuments = async () => {
    setLoading(true);
    try {
      const related = [];

      // Получаем все связанные документы через API
      const response = await fetch(`/api/documents/${document.id}/related?type=all`);
      if (response.ok) {
        const data = await response.json();
        related.push(...data.documents);
      }

      // Дополнительно ищем документы по прямым связям
      if (document.quote_id) {
        const quote = await fetchDocument(document.quote_id, 'quote');
        if (quote) {
          related.push({ ...quote, type: 'quote', relation: 'source' });
        }
      }

      if (document.invoice_id) {
        const invoice = await fetchDocument(document.invoice_id, 'invoice');
        if (invoice) {
          related.push({ ...invoice, type: 'invoice', relation: 'source' });
        }
      }

      if (document.order_id) {
        const order = await fetchDocument(document.order_id, 'order');
        if (order) {
          related.push({ ...order, type: 'order', relation: 'source' });
        }
      }

      // Убираем дубликаты
      const uniqueRelated = related.filter((doc, index, self) => 
        index === self.findIndex(d => d.id === doc.id)
      );

      setRelatedDocs(uniqueRelated);
    } catch (error) {
      console.error('Ошибка получения связанных документов:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocument = async (id: string, type: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Ошибка получения ${type}:`, error);
    }
    return null;
  };

  const fetchDocumentsByOrderId = async (orderId: string) => {
    try {
      const response = await fetch(`/api/documents?order_id=${orderId}`);
      if (response.ok) {
        const data = await response.json();
        return data.documents || [];
      }
    } catch (error) {
      console.error('Ошибка получения счетов:', error);
    }
    return [];
  };

  const fetchDocumentsByQuoteId = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/documents?quote_id=${quoteId}`);
      if (response.ok) {
        const data = await response.json();
        return data.documents || [];
      }
    } catch (error) {
      console.error('Ошибка получения заказов:', error);
    }
    return [];
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'quote':
        return 'КП';
      case 'invoice':
        return 'Счет';
      case 'order':
        return 'Заказ';
      default:
        return 'Документ';
    }
  };

  const getRelationLabel = (relation: string) => {
    switch (relation) {
      case 'source':
        return 'На основе';
      case 'derived':
        return 'Создан';
      default:
        return 'Связан';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Связанные документы</h2>
        </div>
        <div className="text-center text-gray-500 py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (relatedDocs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Связанные документы</h2>
      </div>

      <div className="space-y-3">
        {relatedDocs.map((doc, index) => (
          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {getDocumentTypeLabel(doc.type)} {doc.number}
                  </span>
                  <span className="text-xs text-gray-500">
                    {getRelationLabel(doc.relation)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString('ru-RU')} • {doc.total_amount?.toLocaleString('ru-RU')} ₽
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                doc.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                doc.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                doc.status === 'ACCEPTED' || doc.status === 'PAID' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {doc.status}
              </span>
              <a
                href={`/documents/${doc.id}`}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                title="Открыть документ"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Схема связей */}
      {relatedDocs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            {relatedDocs.map((doc, index) => (
              <div key={doc.id} className="flex items-center space-x-2">
                <span>{getDocumentTypeLabel(doc.type)}</span>
                {index < relatedDocs.length - 1 && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
