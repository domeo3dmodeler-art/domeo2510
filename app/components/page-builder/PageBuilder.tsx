'use client';

import React, { useState, useCallback } from 'react';
import { Toolbar } from './layout/Toolbar';
import { Canvas } from './layout/Canvas';
import { ComponentsPanel } from './panels/ComponentsPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { PagesPanel } from './panels/PagesPanel';
import { CatalogTreePanel } from './panels/CatalogTreePanel';
import { TemplateSelector } from './templates/TemplateSelector';
import { useHistory } from './hooks/useHistory';
import { DocumentProvider } from './context/DocumentContext';
import { DocumentData, Page, BaseElement, BlockConnection } from './types';

// Начальный документ
const initialDocument: DocumentData = {
  id: 'doc-1',
  name: 'Новый проект',
  description: '',
  pages: [
    {
      id: 'page-1',
      name: 'Главная страница',
      slug: 'main',
      elements: [],
      settings: {
        width: 1200,
        height: 800,
        backgroundColor: '#ffffff',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      theme: {
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#1f2937'
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          fontSize: {
            small: '14px',
            medium: '16px',
            large: '18px',
            xlarge: '24px'
          },
          lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.8
          }
        },
        spacing: {
          small: '8px',
          medium: '16px',
          large: '24px'
        },
        borderRadius: {
          small: '4px',
          medium: '8px',
          large: '12px'
        },
        shadows: [
          '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          '0 10px 15px -3px rgb(0 0 0 / 0.1)'
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  settings: {
    theme: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: {
          small: '14px',
          medium: '16px',
          large: '18px',
          xlarge: '24px'
        },
        lineHeight: {
          tight: 1.2,
          normal: 1.5,
          relaxed: 1.8
        }
      },
      spacing: {
        small: '8px',
        medium: '16px',
        large: '24px'
      },
      borderRadius: {
        small: '4px',
        medium: '8px',
        large: '12px'
      },
      shadows: [
        '0 1px 3px rgba(0, 0, 0, 0.1)',
        '0 4px 6px rgba(0, 0, 0, 0.1)',
        '0 10px 15px rgba(0, 0, 0, 0.1)'
      ]
    }
  },
  connections: [], // Связи между блоками
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'draft' as const
};

export function PageBuilder() {
  const [currentDocument, setCurrentDocument] = useState<DocumentData>(initialDocument);
  const [selectedPageId, setSelectedPageId] = useState<string>('page-1');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showComponentsPanel, setShowComponentsPanel] = useState<boolean>(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(true);
  const [showPagesPanel, setShowPagesPanel] = useState<boolean>(true);
  const [showCatalogPanel, setShowCatalogPanel] = useState<boolean>(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState<boolean>(false);

  const {
    history,
    currentIndex,
    addToHistory,
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistory(initialDocument);

  const selectedPage = currentDocument.pages.find(page => page.id === selectedPageId);
  const selectedElement = selectedElementId 
    ? findElementById((selectedPage?.elements as BaseElement[]) || [], selectedElementId)
    : null;

  // Функция для поиска элемента по ID
  function findElementById(elements: BaseElement[], id: string): BaseElement | null {
    for (const element of elements) {
      if (element.id === id) {
        return element;
      }
      if (element.type === 'container' && 'children' in element) {
        const found = findElementById(element.children as BaseElement[], id);
        if (found) return found;
      }
    }
    return null;
  }

  // Обработчики элементов
  const handleAddElement = useCallback((elementType: string, position: { x: number; y: number }) => {
    if (!selectedPage) return;

    const newElement: BaseElement = {
      id: `element-${Date.now()}`,
      type: elementType as any,
      position,
      size: { width: 200, height: 100 },
      constraints: {
        minWidth: 50,
        minHeight: 50,
        maxWidth: 800,
        maxHeight: 600
      },
      style: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        padding: { top: 8, right: 8, bottom: 8, left: 8 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      props: getDefaultProps(elementType),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedDocument = {
      ...currentDocument,
      pages: currentDocument.pages.map(page =>
        page.id === selectedPageId
          ? { ...page, elements: [...page.elements, newElement] }
          : page
      ),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
    setSelectedElementId(newElement.id);
  }, [currentDocument, selectedPageId, addToHistory]);

  const handleUpdateElement = useCallback((elementId: string, updates: Partial<BaseElement>) => {
    if (!selectedPage) return;

    const updatedDocument = {
      ...currentDocument,
      pages: currentDocument.pages.map(page =>
        page.id === selectedPageId
          ? {
              ...page,
              elements: updateElementInTree(page.elements, elementId, updates)
            }
          : page
      ),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
  }, [currentDocument, selectedPageId, addToHistory]);

  const handleDeleteElement = useCallback((elementId: string) => {
    if (!selectedPage) return;

    const updatedDocument = {
      ...currentDocument,
      pages: currentDocument.pages.map(page =>
        page.id === selectedPageId
          ? {
              ...page,
              elements: removeElementFromTree(page.elements, elementId)
            }
          : page
      ),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
    setSelectedElementId(null);
  }, [currentDocument, selectedPageId, addToHistory]);

  const handleSelectElement = useCallback((elementId: string | null) => {
    setSelectedElementId(elementId);
  }, []);

  // Функции для работы с деревом элементов
  function updateElementInTree(elements: BaseElement[], elementId: string, updates: Partial<BaseElement>): BaseElement[] {
    return elements.map(element => {
      if (element.id === elementId) {
        return { ...element, ...updates };
      }
        if (element.type === 'container' && 'children' in element) {
          return {
            ...element,
            children: updateElementInTree(element.children as BaseElement[], elementId, updates)
          };
        }
      return element;
    });
  }

  function removeElementFromTree(elements: BaseElement[], elementId: string): BaseElement[] {
    return elements.filter(element => {
      if (element.id === elementId) {
        return false;
      }
      if (element.type === 'container' && 'children' in element) {
        element.children = removeElementFromTree(element.children as BaseElement[], elementId);
      }
      return true;
    });
  }

  // Получение дефолтных свойств для элемента
  function getDefaultProps(elementType: string): Record<string, any> {
    const defaultProps: Record<string, Record<string, any>> = {
      text: { content: 'Текст', fontSize: 16, color: '#1f2937', fontWeight: 'normal' },
      heading: { content: 'Заголовок', level: 1, fontSize: 24, color: '#1f2937', fontWeight: 'bold' },
      image: { src: '', alt: 'Изображение', width: 200, height: 150 },
      button: { text: 'Кнопка', variant: 'primary', size: 'medium' },
      container: { children: [], layout: 'block', gap: 0 },
      productConfigurator: { categoryIds: [], showFilters: true, showGrid: true },
      productGrid: { categoryIds: [], limit: 12, columns: 3, showPrice: true },
      priceCalculator: { categoryIds: [], showBreakdown: true },
      cart: { showItems: true, showTotal: true }
    };
    return defaultProps[elementType] || {};
  }

  // Обработчики истории
  const handleUndo = useCallback(() => {
    const previousDocument = undo();
    if (previousDocument) {
      setCurrentDocument(previousDocument);
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextDocument = redo();
    if (nextDocument) {
      setCurrentDocument(nextDocument);
    }
  }, [redo]);

  // Обработчики UI
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleViewModeChange = useCallback((mode: 'edit' | 'preview') => {
    setViewMode(mode);
  }, []);

  const handleSave = useCallback(() => {
    // TODO: Реализовать сохранение проекта
    console.log('Сохранение проекта:', currentDocument);
  }, [currentDocument]);


  // Обработчик выбора шаблона
  const handleSelectTemplate = useCallback((template: any) => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      name: template.name,
      slug: template.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      elements: template.elements.map((element: any, index: number) => ({
        ...element,
        id: `element-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
    settings: {
      width: 1200,
      height: 1000,
      backgroundColor: '#ffffff',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
      }
    },
    theme: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        fontSize: {
          small: '14px',
          medium: '16px',
          large: '18px',
          xlarge: '24px'
        },
        lineHeight: {
          tight: 1.2,
          normal: 1.5,
          relaxed: 1.8
        }
      },
      spacing: {
        small: '8px',
        medium: '16px',
        large: '24px'
      },
      borderRadius: {
        small: '4px',
        medium: '8px',
        large: '12px'
      },
      shadows: [
        '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        '0 10px 15px -3px rgb(0 0 0 / 0.1)'
      ]
    },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const newDocument: DocumentData = {
      ...currentDocument,
      pages: [newPage]
    };
    
    setCurrentDocument(newDocument);
    setSelectedPageId(newDocument.pages[0].id);
    setSelectedElementId(null);
    addToHistory(newDocument);
    setShowTemplateSelector(false);
  }, [currentDocument, addToHistory]);

  // Обработчики для страниц
  const handleAddPage = useCallback(() => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      name: `Страница ${currentDocument.pages.length + 1}`,
      slug: `page-${currentDocument.pages.length + 1}`,
      elements: [],
      settings: {
        width: 1200,
        height: 800,
        backgroundColor: '#ffffff',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      theme: {
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          text: '#1f2937'
        },
        typography: {
          fontFamily: 'Inter, sans-serif',
          fontSize: {
            small: '14px',
            medium: '16px',
            large: '18px',
            xlarge: '24px'
          },
          lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.8
          }
        },
        spacing: {
          small: '8px',
          medium: '16px',
          large: '24px'
        },
        borderRadius: {
          small: '4px',
          medium: '8px',
          large: '12px'
        },
        shadows: [
          '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          '0 10px 15px -3px rgb(0 0 0 / 0.1)'
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedDocument = {
      ...currentDocument,
      pages: [...currentDocument.pages, newPage],
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
    setSelectedPageId(newPage.id);
  }, [currentDocument, addToHistory]);

  const handleDeletePage = useCallback((pageId: string) => {
    if (currentDocument.pages.length <= 1) return;

    const updatedDocument = {
      ...currentDocument,
      pages: currentDocument.pages.filter(page => page.id !== pageId),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);

    if (selectedPageId === pageId) {
      setSelectedPageId(updatedDocument.pages[0].id);
    }
    setSelectedElementId(null);
  }, [currentDocument, selectedPageId, addToHistory]);

  // Функции для работы со связями
  const handleAddConnection = useCallback((connectionData: Omit<BlockConnection, 'id'>) => {
    const newConnection: BlockConnection = {
      ...connectionData,
      id: `connection-${Date.now()}`
    };

    const updatedDocument = {
      ...currentDocument,
      connections: [...currentDocument.connections, newConnection],
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
  }, [currentDocument, addToHistory]);

  const handleUpdateConnection = useCallback((connectionId: string, updates: Partial<BlockConnection>) => {
    const updatedDocument = {
      ...currentDocument,
      connections: currentDocument.connections.map(conn =>
        conn.id === connectionId ? { ...conn, ...updates } : conn
      ),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
  }, [currentDocument, addToHistory]);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    const updatedDocument = {
      ...currentDocument,
      connections: currentDocument.connections.filter(conn => conn.id !== connectionId),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
  }, [currentDocument, addToHistory]);

  const handleDuplicatePage = useCallback((pageId: string) => {
    const pageToDuplicate = currentDocument.pages.find(page => page.id === pageId);
    if (!pageToDuplicate) return;

    const newPage: Page = {
      ...pageToDuplicate,
      id: `page-${Date.now()}`,
      name: `${pageToDuplicate.name} (копия)`,
      slug: `${pageToDuplicate.slug}-copy`,
      elements: JSON.parse(JSON.stringify(pageToDuplicate.elements)), // Deep clone
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedDocument = {
      ...currentDocument,
      pages: [...currentDocument.pages, newPage],
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
    setSelectedPageId(newPage.id);
  }, [currentDocument, addToHistory]);

  const handleUpdatePage = useCallback((pageId: string, updates: Partial<Page>) => {
    const updatedDocument = {
      ...currentDocument,
      pages: currentDocument.pages.map(page =>
        page.id === pageId
          ? { ...page, ...updates, updatedAt: new Date().toISOString() }
          : page
      ),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
  }, [currentDocument, addToHistory]);

  return (
    <DocumentProvider value={currentDocument}>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Toolbar */}
               <Toolbar
                 zoom={zoom}
                 viewMode={viewMode}
                 onZoomChange={handleZoomChange}
                 onViewModeChange={handleViewModeChange}
                 onSave={handleSave}
                 onUndo={handleUndo}
                 onRedo={handleRedo}
                 canUndo={canUndo}
                 canRedo={canRedo}
                 showComponentsPanel={showComponentsPanel}
                 showPropertiesPanel={showPropertiesPanel}
                 onToggleComponentsPanel={() => setShowComponentsPanel(!showComponentsPanel)}
                 onTogglePropertiesPanel={() => setShowPropertiesPanel(!showPropertiesPanel)}
                 onTogglePagesPanel={() => setShowPagesPanel(!showPagesPanel)}
                 showCatalogPanel={showCatalogPanel}
                 onToggleCatalogPanel={() => setShowCatalogPanel(!showCatalogPanel)}
                 showPagesPanel={showPagesPanel}
                 onShowTemplates={() => setShowTemplateSelector(true)}
               />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Pages Panel */}
          {showPagesPanel && (
            <PagesPanel
              document={currentDocument}
              selectedPageId={selectedPageId}
              onSelectPage={setSelectedPageId}
              onAddPage={handleAddPage}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              onUpdatePage={handleUpdatePage}
            />
          )}

          {/* Catalog Panel */}
          {showCatalogPanel && (
            <CatalogTreePanel
              onCategorySelect={(categoryId) => {
                console.log('Selected category:', categoryId);
                // TODO: Handle category selection
              }}
            />
          )}

          {/* Components Panel */}
          {showComponentsPanel && (
            <ComponentsPanel
              onAddElement={handleAddElement}
              selectedCategory={null}
            />
          )}

          {/* Canvas */}
          <div className="flex-1 flex flex-col">
            <Canvas
              page={selectedPage}
              selectedElementId={selectedElementId}
              zoom={zoom}
              viewMode={viewMode}
              onSelectElement={handleSelectElement}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onAddElement={handleAddElement}
            />
          </div>

          {/* Properties Panel */}
          {showPropertiesPanel && (
          <PropertiesPanel
              element={selectedElement}
              page={selectedPage}
              onUpdateElement={handleUpdateElement}
              onUpdatePage={(updates) => handleUpdatePage(selectedPageId, updates)}
                      />
                    )}
        </div>

        {/* Export Manager */}

        {/* Template Selector Modal */}
        {showTemplateSelector && (
          <TemplateSelector
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplateSelector(false)}
          />
      )}
      </div>
    </DocumentProvider>
  );
}
