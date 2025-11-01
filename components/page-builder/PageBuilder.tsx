'use client';

import React, { useState, useCallback } from 'react';
import { Toolbar } from './layout/Toolbar';
import { Canvas } from './layout/Canvas';
import { ComponentsPanel } from './panels/ComponentsPanel';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { PagesPanel } from './panels/PagesPanel';
import { CatalogTreePanel } from './panels/CatalogTreePanel';
import { SavePublishPanel } from './panels/SavePublishPanel';
import { TemplateSelector } from './templates/TemplateSelector';
import { useHistory } from './hooks/useHistory';
import { DocumentProvider } from './context/DocumentContext';
import { ConnectionsProvider } from './context/ConnectionsContext';
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
        width: 1440,
        height: 900,
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
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]); // Множественное выделение
  const [zoom, setZoom] = useState<number>(100);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showComponentsPanel, setShowComponentsPanel] = useState<boolean>(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState<boolean>(true);
  const [showPagesPanel, setShowPagesPanel] = useState<boolean>(false); // По умолчанию скрыта
  const [showCatalogPanel, setShowCatalogPanel] = useState<boolean>(false);
  const [showSavePanel, setShowSavePanel] = useState<boolean>(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState<boolean>(false);
  const [savedPages, setSavedPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

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

  console.log('🚨 PageBuilder: Состояние выбора элементов', {
    selectedElementId,
    selectedElementIds,
    selectedElement: selectedElement ? { id: selectedElement.id, type: selectedElement.type } : null,
    selectedPageId,
    selectedPageElements: selectedPage?.elements?.length || 0
  });

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

    console.log('🚨 PageBuilder: handleUpdateElement вызван!', {
      elementId,
      updates,
      selectedPageId
    });

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

    const updatedPage = updatedDocument.pages.find(page => page.id === selectedPageId);
    const updatedElement = updatedPage?.elements.find(el => el.id === elementId);
    console.log('🚨 PageBuilder: Документ обновлен!', {
      elementId,
      updatedElement: updatedElement ? { id: updatedElement.id, type: updatedElement.type } : null
    });

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
    console.log('🚨 PageBuilder: handleSelectElement вызван!', {
      elementId,
      previousSelectedElementId: selectedElementId
    });
    setSelectedElementId(elementId);
    setSelectedElementIds([]); // Сбрасываем множественное выделение
  }, [selectedElementId]);

  const handleSelectElements = useCallback((elementIds: string[]) => {
    console.log('🚨 PageBuilder: handleSelectElements вызван!', {
      elementIds,
      previousSelectedElementIds: selectedElementIds,
      elementsCount: elementIds.length
    });
    setSelectedElementIds(elementIds);
    setSelectedElementId(null); // Сбрасываем одиночное выделение
  }, [selectedElementIds]);

  // Функции для работы с деревом элементов
  function updateElementInTree(elements: BaseElement[], elementId: string, updates: Partial<BaseElement>): BaseElement[] {
    console.log('🚨 updateElementInTree: Обновляем элемент', {
      elementId,
      updates,
      updatesProps: updates.props,
      elementsCount: elements.length
    });
    
    return elements.map(element => {
      if (element.id === elementId) {
        console.log('🚨 updateElementInTree: НАЙДЕН ЭЛЕМЕНТ!', {
          elementId,
          currentProps: element.props,
          updatesProps: updates.props,
          updatesPropsPropertyName: updates.props?.propertyName
        });
        
        // ИСПРАВЛЕНИЕ: Правильно мержим props
        const updatedElement = { 
          ...element, 
          ...updates,
          props: {
            ...element.props,
            ...(updates.props || {})
          }
        };
        console.log('🚨 updateElementInTree: Элемент найден и обновлен', {
          elementId,
          oldProps: element.props,
          newProps: updatedElement.props,
          propertyName: updatedElement.props.propertyName
        });
        return updatedElement;
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

  const handlePageSizeChange = useCallback((width: number, height: number) => {
    if (!selectedPage) return;

    const updatedDocument = {
      ...currentDocument,
      pages: currentDocument.pages.map(page =>
        page.id === selectedPageId
          ? {
              ...page,
              settings: {
                ...page.settings,
                width: width,
                height: height
              }
            }
          : page
      ),
      updatedAt: new Date().toISOString()
    };

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
  }, [currentDocument, selectedPageId, addToHistory]);

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

  // Функция для обработки данных связей
  const handleConnectionData = useCallback((sourceElementId: string, data: any) => {
    console.log('🔗 handleConnectionData вызвана:', { sourceElementId, data });
    console.log('🔗 Все связи в документе:', currentDocument.connections);
    console.log('🔗 Количество связей:', currentDocument.connections?.length || 0);
    
    // Находим все активные связи, где данный элемент является ИСТОЧНИКОМ данных
    const outgoingConnections = (currentDocument.connections || []).filter(conn => {
      const matches = conn.sourceElementId === sourceElementId && conn.isActive;
      console.log('🔗 Проверка ИСХОДЯЩЕЙ связи:', {
        connectionId: conn.id,
        sourceElementId: conn.sourceElementId,
        targetElementId: conn.targetElementId,
        isActive: conn.isActive,
        lookingFor: sourceElementId,
        matches,
        sourceElementIdType: typeof conn.sourceElementId,
        lookingForType: typeof sourceElementId,
        strictEquals: conn.sourceElementId === sourceElementId,
        looseEquals: conn.sourceElementId == sourceElementId
      });
      return matches;
    });

    console.log('🔗 Найдены исходящие связи:', outgoingConnections);
    console.log('🔗 Количество найденных связей:', outgoingConnections.length);

    if (outgoingConnections.length === 0) {
      console.log('⚠️ НЕТ АКТИВНЫХ СВЯЗЕЙ для элемента:', sourceElementId);
      console.log('⚠️ Все связи в документе:', currentDocument.connections);
      return;
    }

    // Обновляем целевые элементы
    outgoingConnections.forEach(connection => {
      const targetElement = findElementById((selectedPage?.elements as BaseElement[]) || [], connection.targetElementId);
      
      console.log('🔗 Обрабатываем связь:', { 
        connection, 
        targetElement: targetElement ? { id: targetElement.id, type: targetElement.type } : null 
      });
      
      if (targetElement) {
        // Обновляем элемент в зависимости от типа связи
        switch (connection.connectionType) {
          case 'filter':
            // Синхронизация фильтров
            console.log('🔍 Синхронизация фильтров:', { 
              sourceElementId, 
              targetElementId: connection.targetElementId, 
              data,
              targetElementType: targetElement.type 
            });
            
            // Если целевой элемент - PropertyFilter, обновляем его фильтры
            if (targetElement.type === 'propertyFilter') {
              // Передаем фильтр по свойству товара
              const propertyName = data.propertyName;
              const propertyValue = data.value || data;
              
              console.log('🔍 Обновляем PropertyFilter фильтр:', { 
                propertyName, 
                propertyValue,
                targetElementId: connection.targetElementId,
                data 
              });
              
              // Обновляем целевой элемент с новыми фильтрами
              const updates: Partial<BaseElement> = {
                props: {
                  ...targetElement.props,
                  filters: {
                    propertyName: propertyName,
                    propertyValue: propertyValue,
                    categoryIds: data.categoryIds
                  }
                }
              };
              
              console.log('🔍 Применяем обновления к PropertyFilter:', updates);
              handleUpdateElement(connection.targetElementId, updates);
            }
            // Для других типов элементов передаем через filters
            else if (connection.targetProperty === 'filters') {
              const updates: Partial<BaseElement> = {
                props: {
                  ...targetElement.props,
                  filters: { ...targetElement.props.filters, [connection.sourceProperty]: data }
                }
              };
              handleUpdateElement(connection.targetElementId, updates);
            }
            break;
          case 'cart':
            // Добавление в корзину
            console.log('🛒 Добавление в корзину:', data);
            break;
          case 'navigate':
            // Навигация
            console.log('🧭 Навигация:', data);
            break;
        }
      } else {
        console.error('❌ Целевой элемент не найден:', connection.targetElementId);
      }
    });
  }, [currentDocument.connections, selectedPage?.elements, handleUpdateElement]);

  // Функция для тестирования связей
  const handleCreateTestConnection = useCallback(() => {
    console.log('🧪 Тест связей: Создаем тестовую связь');
    
    // Находим PropertyFilter элементы на странице
    const elements = selectedPage?.elements || [];
    const propertyFilters = elements.filter(el => el.type === 'propertyFilter');
    
    if (propertyFilters.length < 2) {
      alert('Нужно минимум 2 PropertyFilter элемента для создания связи. Добавьте PropertyFilter компоненты на страницу.');
      return;
    }
    
    const firstFilter = propertyFilters[0];
    const secondFilter = propertyFilters[1];
    
    console.log('🧪 Тест связей: Создаем связь между PropertyFilter:', {
      source: { id: firstFilter.id, type: firstFilter.type, propertyName: firstFilter.props.propertyName },
      target: { id: secondFilter.id, type: secondFilter.type, propertyName: secondFilter.props.propertyName }
    });
    
    // Создаем тестовую связь между PropertyFilter
    const testConnection: BlockConnection = {
      id: `test-connection-${Date.now()}`,
      sourceElementId: firstFilter.id,
      targetElementId: secondFilter.id,
      connectionType: 'filter',
      sourceProperty: 'selectedValue',
      targetProperty: 'filters',
      description: `Связь фильтра: ${firstFilter.props.propertyName} → ${secondFilter.props.propertyName}`,
      isActive: true
    };
    
    const updatedDocument = {
      ...currentDocument,
      connections: [...(currentDocument.connections || []), testConnection],
      updatedAt: new Date().toISOString()
    };
    
    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
    
    console.log('🧪 Тест связей: Связь создана:', testConnection);
    console.log('🧪 Тест связей: Все связи в документе:', updatedDocument.connections);
    
    // Тестируем передачу данных через связь
    setTimeout(() => {
      console.log('🧪 Тест связей: Тестируем передачу данных...');
      const testData = {
        type: 'filter',
        propertyName: firstFilter.props.propertyName || 'Domeo_Стиль Web',
        value: 'Современная',
        categoryIds: firstFilter.props.categoryIds || []
      };
      
      console.log('🧪 Тест связей: Отправляем тестовые данные:', testData);
      handleConnectionData(firstFilter.id, testData);
    }, 1000);
    
    alert(`Связь создана между PropertyFilter "${firstFilter.props.propertyName}" и "${secondFilter.props.propertyName}". Проверьте консоль для логов.`);
  }, [currentDocument, selectedPage, addToHistory, handleConnectionData]);

  // Функция для ручного тестирования передачи данных
  const handleTestDataTransfer = useCallback(() => {
    console.log('🧪 Тест передачи данных: Начинаем тест');
    
    const elements = selectedPage?.elements || [];
    const propertyFilters = elements.filter(el => el.type === 'propertyFilter');
    
    if (propertyFilters.length < 1) {
      alert('Нужно минимум 1 PropertyFilter для тестирования передачи данных.');
      return;
    }
    
    const firstFilter = propertyFilters[0];
    
    console.log('🧪 Тест передачи данных: Используем фильтр:', {
      id: firstFilter.id,
      propertyName: firstFilter.props.propertyName,
      categoryIds: firstFilter.props.categoryIds
    });
    
    // Создаем тестовые данные
    const testData = {
      type: 'filter',
      propertyName: firstFilter.props.propertyName || 'Domeo_Стиль Web',
      value: 'Тестовое значение',
      categoryIds: firstFilter.props.categoryIds || []
    };
    
    console.log('🧪 Тест передачи данных: Отправляем данные:', testData);
    handleConnectionData(firstFilter.id, testData);
    
    alert('Тестовые данные отправлены. Проверьте консоль для логов.');
  }, [selectedPage, handleConnectionData]);

  // Функция для создания новой связи
  const handleCreateConnection = useCallback((sourceElementId: string, targetElementId: string, connectionType: BlockConnection['connectionType']) => {
    console.log('🔗 Создание связи:', { sourceElementId, targetElementId, connectionType });
    
    const newConnection: BlockConnection = {
      id: `connection-${Date.now()}`,
      sourceElementId,
      targetElementId,
      connectionType,
      isActive: true,
      description: `Связь ${connectionType} между элементами`
    };

    console.log('🔗 Новая связь:', newConnection);
    console.log('🔗 Проверка ID элементов:', {
      sourceElementExists: selectedPage?.elements?.find(el => el.id === sourceElementId) ? 'ДА' : 'НЕТ',
      targetElementExists: selectedPage?.elements?.find(el => el.id === targetElementId) ? 'ДА' : 'НЕТ',
      allElementIds: selectedPage?.elements?.map(el => el.id),
      sourceElementId,
      targetElementId
    });

    const updatedDocument = {
      ...currentDocument,
      connections: [...(currentDocument.connections || []), newConnection],
      updatedAt: new Date().toISOString()
    };

    console.log('🔗 Обновленный документ:', {
      connectionsCount: updatedDocument.connections.length,
      connections: updatedDocument.connections
    });

    setCurrentDocument(updatedDocument);
    addToHistory(updatedDocument);
    
    // Сбрасываем множественное выделение
    setSelectedElementIds([]);
  }, [currentDocument, addToHistory]);

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

  // Загрузка сохраненных страниц
  const loadSavedPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const response = await fetch('/api/pages/simple-create');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSavedPages(data.pages);
        }
      }
    } catch (error) {
      console.error('Error loading saved pages:', error);
    } finally {
      setLoadingPages(false);
    }
  }, []);

  // Сохранение страницы
  const handleSavePage = useCallback(async (title: string, description: string) => {
    const currentPage = currentDocument.pages.find(p => p.id === selectedPageId);
    if (!currentPage) throw new Error('Страница не найдена');

    const response = await fetch('/api/pages/simple-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        elements: currentPage.elements.map(element => ({
          type: element.type,
          props: element.props,
          position: element.position,
          size: element.size,
          zIndex: element.zIndex,
          parentId: element.parentId
        })),
        isPublished: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка сохранения');
    }

    const data = await response.json();
    if (data.success) {
      await loadSavedPages(); // Обновляем список страниц
    }
  }, [currentDocument, selectedPageId, loadSavedPages]);

  // Публикация страницы
  const handlePublishPage = useCallback(async (pageId: string) => {
    const response = await fetch(`/api/pages/${pageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isPublished: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка публикации');
    }

    await loadSavedPages(); // Обновляем список страниц
  }, [loadSavedPages]);

  // Загрузка страницы
  const handleLoadPage = useCallback(async (pageId: string) => {
    const response = await fetch(`/api/pages/${pageId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка загрузки');
    }

    const data = await response.json();
    if (data.success) {
      const page = data.page;
      
      // Создаем новую страницу в документе
      const newPage: Page = {
        id: `page-${Date.now()}`,
        name: page.title,
        slug: page.url,
        elements: page.elements.map((element: any) => ({
          id: `element-${Date.now()}-${Math.random()}`,
          type: element.type,
          props: element.props,
          position: element.position,
          size: element.size,
          zIndex: element.zIndex,
          parentId: element.parentId
        })),
        settings: {
          width: 1200,
          height: 800,
          backgroundColor: '#ffffff',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          margin: { top: 0, right: 0, bottom: 0, left: 0 }
        },
        theme: currentDocument.pages && currentDocument.pages.length > 0 ? currentDocument.pages[0].theme : {
          colors: { primary: '#3b82f6', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff', text: '#1f2937' },
          typography: { fontFamily: 'Inter, sans-serif', fontSize: { small: '14px', medium: '16px', large: '18px', xlarge: '24px' }, lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.8 } },
          spacing: { small: '8px', medium: '16px', large: '24px' },
          borderRadius: { small: '4px', medium: '8px', large: '12px' },
          shadows: ['0 1px 3px rgba(0, 0, 0, 0.1)', '0 4px 6px rgba(0, 0, 0, 0.1)', '0 10px 15px rgba(0, 0, 0, 0.1)']
        }
      };

      setCurrentDocument(prev => ({
        ...prev,
        pages: [...prev.pages, newPage]
      }));

      setSelectedPageId(newPage.id);
    }
  }, [currentDocument.pages]);

  // Загрузка сохраненных страниц при загрузке компонента
  React.useEffect(() => {
    loadSavedPages();
  }, [loadSavedPages]);

  return (
    <ConnectionsProvider>
      <DocumentProvider value={currentDocument}>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Toolbar */}
               <Toolbar
                 zoom={zoom}
                 viewMode={viewMode}
                 pageWidth={selectedPage?.settings?.width || 1440}
                 pageHeight={selectedPage?.settings?.height || 900}
                 onZoomChange={handleZoomChange}
                 onViewModeChange={handleViewModeChange}
                 onPageSizeChange={handlePageSizeChange}
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
                 showSavePanel={showSavePanel}
                 onToggleSavePanel={() => setShowSavePanel(!showSavePanel)}
                 showPagesPanel={showPagesPanel}
                 onShowTemplates={() => setShowTemplateSelector(true)}
               />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Pages Panel */}
          {showPagesPanel && (
            <div className="w-64 lg:w-72 xl:w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
              <PagesPanel
                document={currentDocument}
                selectedPageId={selectedPageId}
                onSelectPage={setSelectedPageId}
                onAddPage={handleAddPage}
                onDeletePage={handleDeletePage}
                onDuplicatePage={handleDuplicatePage}
                onUpdatePage={handleUpdatePage}
              />
            </div>
          )}

          {/* Catalog Panel */}
          {showCatalogPanel && (
            <div className="w-64 lg:w-72 xl:w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
              <CatalogTreePanel
                onCategorySelect={(categoryId) => {
                  console.log('Selected category:', categoryId);
                  // TODO: Handle category selection
                }}
              />
            </div>
          )}

          {/* Save/Publish Panel */}
          {showSavePanel && (
            <div className="w-80 lg:w-96 xl:w-[28rem] bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
              <SavePublishPanel
                document={currentDocument}
                onSave={handleSavePage}
                onPublish={handlePublishPage}
                onLoad={handleLoadPage}
                savedPages={savedPages}
                isLoading={loadingPages}
              />
            </div>
          )}

          {/* Components Panel */}
          {showComponentsPanel && (
            <div className="w-64 lg:w-72 xl:w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden">
              <ComponentsPanel
                onAddElement={handleAddElement}
                selectedCategory={null}
              />
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 flex flex-col min-w-0">
            <Canvas
              page={selectedPage ? { ...selectedPage, connections: currentDocument.connections } : undefined}
              selectedElementId={selectedElementId}
              selectedElementIds={selectedElementIds}
              zoom={zoom}
              viewMode={viewMode}
              onSelectElement={handleSelectElement}
              onSelectElements={handleSelectElements}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onAddElement={handleAddElement}
              onConnectionData={handleConnectionData}
              onUpdateConnection={handleUpdateConnection}
              onDeleteConnection={handleDeleteConnection}
              onCreateConnection={handleCreateConnection}
            />
          </div>

          {/* Properties Panel */}
          {showPropertiesPanel && (
            <div className="w-80 lg:w-96 xl:w-[28rem] bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden">
              <PropertiesPanel
                element={selectedElement}
                page={selectedPage}
                onUpdateElement={handleUpdateElement}
                onUpdatePage={(updates) => handleUpdatePage(selectedPageId, updates)}
              />
            </div>
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
    </ConnectionsProvider>
  );
}
