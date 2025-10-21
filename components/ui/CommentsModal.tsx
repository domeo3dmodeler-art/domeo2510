'use client';

import React, { useState, useEffect } from 'react';
import { StickyNote, History, Send, Trash2, Edit3, X } from 'lucide-react';
import { Button } from './Button';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    role: string;
  };
}

interface HistoryEntry {
  id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  details?: string;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    role: string;
  };
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentType: 'quote' | 'invoice' | 'supplier_order';
  documentNumber: string;
}

export default function CommentsModal({
  isOpen,
  onClose,
  documentId,
  documentType,
  documentNumber
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Получаем текущего пользователя
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      fetchCurrentUser();
    }
  }, [isOpen, documentId]);

  const fetchCurrentUser = async () => {
    try {
      // Получаем токен из cookies
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        console.warn('No auth token found');
        return;
      }

      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      } else {
        console.warn('Failed to fetch current user:', response.status);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newComment.trim(),
          user_id: currentUser.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setNewComment('');
        
        // Добавляем запись в историю
        await fetch(`/api/documents/${documentId}/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'comment_added',
            user_id: currentUser.id,
            details: JSON.stringify({ comment_text: newComment.trim() })
          })
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        
        // Добавляем запись в историю
        if (currentUser) {
          await fetch(`/api/documents/${documentId}/history`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'comment_deleted',
              user_id: currentUser.id,
              details: JSON.stringify({ comment_id: commentId })
            })
          });
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditText(comment.text);
  };

  const saveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: editText.trim()
        })
      });

      if (response.ok) {
        setComments(comments.map(c => 
          c.id === commentId ? { ...c, text: editText.trim() } : c
        ));
        setEditingComment(null);
        setEditText('');
        
        // Добавляем запись в историю
        if (currentUser) {
          await fetch(`/api/documents/${documentId}/history`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'comment_edited',
              user_id: currentUser.id,
              details: JSON.stringify({ comment_id: commentId })
            })
          });
        }
      }
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditText('');
  };

  const formatUserName = (user: Comment['user']) => {
    const lastName = user.last_name;
    const firstName = user.first_name.charAt(0) + '.';
    const middleName = user.middle_name ? user.middle_name.charAt(0) + '.' : '';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <StickyNote className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Комментарии - {documentType === 'quote' ? 'КП' : documentType === 'invoice' ? 'Счет' : 'Заказ у поставщика'} {documentNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Add Comment Form */}
        <div className="p-6 border-b">
          <div className="flex space-x-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Добавить комментарий..."
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <Button
              onClick={addComment}
              disabled={!newComment.trim() || submitting}
              className="self-end"
            >
              {submitting ? '...' : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Загрузка комментариев...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <StickyNote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Пока нет комментариев</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">
                          {formatUserName(comment.user)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {comment.user.role}
                        </span>
                      </div>
                      
                      {editingComment === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => saveEdit(comment.id)}
                              size="sm"
                              className="text-xs"
                            >
                              Сохранить
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700">{comment.text}</p>
                      )}
                    </div>
                    
                    {currentUser && currentUser.id === comment.user.id && editingComment !== comment.id && (
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => startEdit(comment)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
