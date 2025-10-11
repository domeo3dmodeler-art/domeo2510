'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { DocumentData, DocumentContextType, Page } from '../types';

const DocumentContext = createContext<DocumentContextType | null>(null);

interface DocumentProviderProps {
  value: DocumentData;
  children: ReactNode;
}

export function DocumentProvider({ value, children }: DocumentProviderProps) {
  const updateDocument = (updates: Partial<DocumentData>) => {
    // Эта функция будет реализована в родительском компоненте
    console.log('Обновление документа:', updates);
  };

  const addPage = (page: Page) => {
    console.log('Добавление страницы:', page);
  };

  const updatePage = (pageId: string, updates: Partial<Page>) => {
    console.log('Обновление страницы:', pageId, updates);
  };

  const deletePage = (pageId: string) => {
    console.log('Удаление страницы:', pageId);
  };

  const contextValue: DocumentContextType = {
    document: value,
    updateDocument,
    addPage,
    updatePage,
    deletePage
  };

  return (
    <DocumentContext.Provider value={contextValue}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}
