'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Badge, Input, Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui';
import { Plus, Search, Folder, FolderOpen, Edit, Trash2, Settings, ChevronRight, ChevronDown, Package, Package2 } from 'lucide-react';
import { CatalogCategory, CreateCatalogCategoryDto } from '@/lib/types/catalog';
import TemplateManager from '../../../components/admin/TemplateManager';
import PriceListExporter from '../../../components/admin/PriceListExporter';
import BulkEditDialog from '../../../components/admin/BulkEditDialog';
import ProductFilters from '../../../components/admin/ProductFilters';
import { fixFieldsEncoding } from '@/lib/encoding-utils';

interface Product {
  id: string;
  sku: string;
  name: string;
  base_price: number;
  stock_quantity: number;
  brand?: string;
  model?: string;
  properties_data: string | Record<string, any>;
  specifications?: Record<string, any>;
  images?: Array<{ url: string; alt_text?: string }>;
}

interface ImportTemplate {
  id: string;
  catalog_category_id: string;
  name: string;
  description: string;
  requiredFields: string[];
  calculatorFields: string[];
  exportFields: string[];
  templateConfig: {
    headers: string[];
  };
  created_at: string;
  updated_at: string;
}

interface CatalogTreeProps {
  categories: CatalogCategory[];
  onCategorySelect: (category: CatalogCategory) => void;
  onCategoryCreate: (parentId?: string) => void;
  onCategoryEdit: (category: CatalogCategory) => void;
  onCategoryDelete: (category: CatalogCategory) => void;
  selectedCategory: CatalogCategory | null;
  selectedTemplate: ImportTemplate | null;
  templateLoading: boolean;
  loadTemplate: (categoryId: string) => void;
  categoryProducts: Product[];
  productsLoading: boolean;
  loadCategoryProducts: (categoryId: string) => void;
}

function CatalogTree({ 
  categories, 
  onCategorySelect, 
  onCategoryCreate, 
  onCategoryEdit, 
  onCategoryDelete,
  selectedCategory,
  selectedTemplate,
  templateLoading,
  loadTemplate,
  categoryProducts,
  productsLoading,
  loadCategoryProducts
}: CatalogTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<CatalogCategory[]>([]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleCategorySelect = (category: CatalogCategory) => {
    onCategorySelect(category);
    
    // Обновляем хлебные крошки
    const buildBreadcrumbs = (cat: CatalogCategory, allCategories: CatalogCategory[]): CatalogCategory[] => {
      const crumbs: CatalogCategory[] = [cat];
      // Здесь можно добавить логику для построения полного пути
      return crumbs;
    };
    
    setBreadcrumbs(buildBreadcrumbs(category, categories));
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCategory = (category: CatalogCategory, level: number = 0) => {
    const hasChildren = category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedNodes.has(category.id);
    const indent = level * 24; // Увеличиваем отступ для лучшей визуализации

    return (
      <div key={category.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 cursor-pointer group transition-colors duration-150 ${
            level === 0 
              ? 'hover:bg-blue-50 border-l-2 border-transparent hover:border-blue-200' 
              : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${indent + 12}px` }}
          onClick={() => handleCategorySelect(category)}
        >
          {/* Индикатор раскрытия/сворачивания */}
          <div className="flex items-center w-6 mr-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(category.id);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors duration-150"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
              </div>
            )}
          </div>

          {/* Иконка категории */}
          <div className="mr-3">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500" />
              )
            ) : (
              <Package2 className="h-4 w-4 text-gray-400" />
            )}
          </div>
          
          {/* Основной контент */}
          <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-3 min-w-0">
              <span className={`font-medium truncate ${
                level === 0 ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {category.name}
              </span>
              
              {/* Счетчик товаров */}
              <Badge 
                variant="secondary" 
                className={`text-xs shrink-0 ${
                  (category.products_count || 0) > 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {category.products_count || 0}
              </Badge>
            </div>
            
            {/* Действия (показываются при наведении) */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCategoryCreate(category.id);
                }}
                className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-600"
                title="Добавить подкатегорию"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCategoryEdit(category);
                }}
                className="h-7 w-7 p-0 hover:bg-gray-100"
                title="Редактировать"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCategoryDelete(category);
                }}
                className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                title="Удалить"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Подкатегории с анимацией */}
        {hasChildren && isExpanded && (
          <div className="overflow-hidden">
            <div className="transition-all duration-200 ease-in-out">
              {category.subcategories?.map(subcategory => 
                renderCategory(subcategory, level + 1)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Поиск и действия */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск категорий..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => onCategoryCreate()}
          size="sm"
          className="flex items-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          <span>Добавить</span>
        </Button>
      </div>

      {/* Хлебные крошки */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
          <span>Путь:</span>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.id}>
              {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
              <button
                onClick={() => handleCategorySelect(crumb)}
                className="hover:text-blue-600 transition-colors duration-150"
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Информация о выбранной категории */}
      {selectedCategory && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">{selectedCategory.name}</h3>
              <p className="text-sm text-blue-700">
                Уровень {selectedCategory.level} • {selectedCategory.products_count || 0} товаров
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCategoryEdit(selectedCategory)}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                <Edit className="h-3 w-3 mr-1" />
                Редактировать
              </Button>
            </div>
          </div>
        </div>
      )}

      
      <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">
              {searchTerm ? 'Категории не найдены' : 'Каталог пуст'}
            </p>
            <p className="text-sm text-gray-400">
              {searchTerm 
                ? 'Попробуйте изменить поисковый запрос' 
                : 'Добавьте категории или импортируйте каталог'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCategories.map(category => renderCategory(category, 0))}
          </div>
        )}
      </div>
    </div>
  );
}


export default function CatalogPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ImportTemplate | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(500);
  const [currentLoadedCount, setCurrentLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CatalogCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CatalogCategory | null>(null);
  const [newCategoryParent, setNewCategoryParent] = useState<string | undefined>();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/catalog/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadCategoryProducts = useCallback(async (categoryId: string, limit?: number, append: boolean = false) => {
    const actualLimit = limit || itemsPerPage;
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setProductsLoading(true);
      }
      
      const offset = append ? currentLoadedCount : 0;
      const response = await fetch(`/api/catalog/products?category=${categoryId}&limit=${actualLimit}&offset=${offset}`);
      const data = await response.json();
      
      
      if (data.success && data.products) {
        
        if (append) {
          // Дозагружаем товары
          setCategoryProducts(prev => [...prev, ...data.products]);
          setCurrentLoadedCount(prev => prev + data.products.length);
        } else {
          // Загружаем с начала
          setCategoryProducts(data.products);
          setCurrentLoadedCount(data.products.length);
        }
        setTotalProductsCount(data.total || 0);
      } else {
        if (!append) {
          setCategoryProducts([]);
          setCurrentLoadedCount(0);
        }
        setTotalProductsCount(0);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      if (!append) {
        setCategoryProducts([]);
        setCurrentLoadedCount(0);
      }
    } finally {
      setProductsLoading(false);
      setLoadingMore(false);
    }
  }, [itemsPerPage, currentLoadedCount]);

  const loadTemplate = useCallback(async (categoryId: string) => {
    try {
      setTemplateLoading(true);
      const response = await fetch(`/api/admin/templates?catalogCategoryId=${categoryId}`);
      const data = await response.json();
      
      
      if (data.success && data.template) {
        const template = data.template;
        
        if (template.requiredFields) {
          try {
            const fields = template.requiredFields; // Уже парсится в API
            // Исправляем кодировку полей
            const fixedFields = fixFieldsEncoding(fields);
          } catch (e) {
            console.error('Error processing requiredFields:', e);
          }
        } else {
          console.error('Template has no requiredFields!');
        }
        
        setSelectedTemplate(template);
      } else {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      setSelectedTemplate(null);
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const handleCategorySelect = useCallback((category: CatalogCategory) => {
    setSelectedCategory(category);
    setSelectedTemplate(null); // Сбрасываем шаблон - будем считать что следующая загрузка будет первая
    setCurrentLoadedCount(0); // Сбрасываем счетчик загруженных товаров
    if (category.id) {
      loadTemplate(category.id);
      loadCategoryProducts(category.id); // Загружаем товары с настройками по умолчанию
    }
  }, [loadTemplate, loadCategoryProducts]);

  // Функции для массового редактирования
  const handleBulkEdit = useCallback(async (updates: Array<{ id: string; updates: Partial<Product> }>) => {
    try {
      const response = await fetch('/api/admin/products/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Успешно обновлено ${result.updated} товаров`);
        
        // Перезагружаем товары
        if (selectedCategory) {
          await loadCategoryProducts(selectedCategory.id);
        }
        
        // Очищаем выбор
        setSelectedProducts(new Set());
      } else {
        alert(`❌ Ошибка при обновлении: ${result.error}`);
      }
    } catch (error) {
      console.error('Ошибка массового редактирования:', error);
      alert('Ошибка при массовом редактировании товаров');
    }
  }, [selectedCategory, loadCategoryProducts]);

  const handleProductSelect = useCallback((productId: string, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredProducts.map(p => p.id));
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts(new Set());
    }
  }, [filteredProducts]);

  const handleFilteredProducts = useCallback((products: Product[]) => {
    setFilteredProducts(products);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilteredProducts(categoryProducts);
  }, [categoryProducts]);

  // Обновляем отфильтрованные товары при изменении категории
  useEffect(() => {
    setFilteredProducts(categoryProducts);
    setSelectedProducts(new Set());
  }, [categoryProducts]);

  const handleCategoryCreate = (parentId?: string) => {
    setNewCategoryParent(parentId);
    setCreateDialogOpen(true);
  };

  const handleCategoryEdit = (category: CatalogCategory) => {
    setCategoryToEdit(category);
    setEditDialogOpen(true);
  };

  const handleCategoryDelete = (category: CatalogCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAllProducts = async (categoryId: string) => {
    try {
      
      const response = await fetch(`/api/admin/products/delete-all?categoryId=${categoryId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Успешно удалено ${result.deleted} товаров из категории "${selectedCategory?.name}"`);
        
        // Обновляем счетчики товаров в категориях каталога
        try {
          const updateCountsResponse = await fetch('/api/admin/categories/update-counts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (updateCountsResponse.ok) {
            const countsData = await updateCountsResponse.json();
            // Счетчики обновлены
          } else {
            // Не удалось обновить счетчики
          }
        } catch (updateError) {
          // Ошибка при обновлении счетчиков
        }
        
        // Перезагружаем список товаров
        await loadCategoryProducts(categoryId);
        // Перезагружаем список категорий для обновления счетчиков
        await loadCategories();
      } else {
        alert(`Ошибка при удалении товаров: ${result.error}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении товаров:', error);
      alert('Ошибка при удалении товаров');
    }
  };

  const handleCreateCategory = async (data: CreateCatalogCategoryDto) => {
    try {
      const response = await fetch('/api/catalog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          parent_id: newCategoryParent
        })
      });

      if (response.ok) {
        await loadCategories();
        setCreateDialogOpen(false);
        setNewCategoryParent(undefined);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleEditCategory = async (data: CreateCatalogCategoryDto) => {
    if (!categoryToEdit) return;

    try {
      const response = await fetch(`/api/catalog/categories/${categoryToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await loadCategories();
        setEditDialogOpen(false);
        setCategoryToEdit(null);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/catalog/categories/${categoryToDelete.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadCategories();
        setDeleteDialogOpen(false);
        setCategoryToDelete(null);
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка каталога...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-4">Дерево каталога</h2>
            <CatalogTree
              categories={categories}
              onCategorySelect={handleCategorySelect}
              onCategoryCreate={handleCategoryCreate}
              onCategoryEdit={handleCategoryEdit}
              onCategoryDelete={handleCategoryDelete}
              selectedCategory={selectedCategory}
              selectedTemplate={selectedTemplate}
              templateLoading={templateLoading}
              loadTemplate={loadTemplate}
              categoryProducts={categoryProducts}
              productsLoading={productsLoading}
              loadCategoryProducts={loadCategoryProducts}
            />
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-4">
            {selectedCategory ? (
              <div className="space-y-6">
                {/* Заголовок с информацией о категории */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedCategory.name}</h2>
                    <div className="text-sm text-gray-600 mt-1">
                      ID: {selectedCategory.id} • Уровень: {selectedCategory.level}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TemplateManager
                      catalogCategoryId={selectedCategory?.id || null}
                      catalogCategoryName={selectedCategory?.name}
                    />
                    <PriceListExporter
                      catalogCategoryId={selectedCategory?.id || null}
                      catalogCategoryName={selectedCategory?.name}
                    />
                    {selectedProducts.size > 0 && (
                      <Button
                        onClick={() => setBulkEditOpen(true)}
                        variant="primary"
                        className="flex items-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Редактировать ({selectedProducts.size})</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Фильтры товаров */}
                {categoryProducts.length > 0 && (
                  <ProductFilters
                    products={categoryProducts}
                    onFilteredProducts={handleFilteredProducts}
                    onClearFilters={handleClearFilters}
                  />
                )}

                {/* Список товаров */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-medium text-gray-900">Товары категории</h3>
                    {productsLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  
                  {productsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Загрузка товаров...</p>
                    </div>
                  ) : categoryProducts.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-600">
                            Найдено товаров: <span className="font-semibold text-blue-600">{totalProductsCount}</span>
                            {currentLoadedCount < totalProductsCount && (
                              <span className="text-gray-500 ml-2">(показано {currentLoadedCount})</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-600">Показать:</label>
                            <select
                              value={itemsPerPage}
                              onChange={(e) => {
                                const newItemsPerPage = parseInt(e.target.value);
                                setItemsPerPage(newItemsPerPage);
                                setCurrentLoadedCount(0); // Сбрасываем счетчик при изменении размера страницы
                                if (selectedCategory) {
                                  loadCategoryProducts(selectedCategory.id, newItemsPerPage);
                                }
                              }}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                              <option value={250}>250</option>
                              <option value={500}>500</option>
                              <option value={1000}>1000</option>
                              <option value={totalProductsCount}>Все ({totalProductsCount})</option>
                            </select>
                            <span className="text-sm text-gray-500">товаров</span>
                          </div>
                        </div>
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex items-center space-x-1"
                          onClick={() => {
                            const totalProductsCount = selectedCategory.products_count || 0;
                            if (confirm(`Вы уверены, что хотите удалить все товары (${totalProductsCount} шт.) из категории "${selectedCategory.name}"? Это действие нельзя отменить.`)) {
                              handleDeleteAllProducts(selectedCategory.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Удалить все товары</span>
                        </Button>
                      </div>
                      
                      {/* Таблица товаров в стиле Excel */}
                      <div className="relative">
                        <div className="overflow-x-auto max-w-full border border-gray-200 rounded-lg shadow-sm">
                          <table className="min-w-full border-separate border-spacing-0" style={{ minWidth: '1200px' }}>
                          {/* Заголовки таблицы - только динамические поля из шаблона */}
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                                  onChange={(e) => handleSelectAll(e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                #
                              </th>
                              {/* Динамические заголовки из requiredFields шаблона */}
                              {(() => {
                                
                                if (selectedTemplate?.requiredFields) {
                                  try {
                                    let requiredFields = selectedTemplate.requiredFields; // Уже парсится в API
                                    
                                    // Проверяем, что requiredFields является массивом
                                    if (typeof requiredFields === 'string') {
                                      requiredFields = JSON.parse(requiredFields);
                                    }
                                    
                                    if (Array.isArray(requiredFields) && requiredFields.length > 0) {
                                      // Исправляем кодировку полей
                                      const fixedFields = fixFieldsEncoding(requiredFields);
                                      
                                      // Фильтруем поля, исключая нежелательные и пустые
                                      const filteredFields = fixedFields.filter((field: string) => {
                                        // Проверяем, что поле валидно
                                        const isValidField = field && 
                                                           typeof field === 'string' &&
                                                           field.trim() !== '' && 
                                                           field !== '_' &&
                                                           !field.includes('№') && 
                                                           !field.includes('Domeo_Ссылка на фото двери') &&
                                                           !field.includes('DOMEO_ССЫЛКА НА ФОТО ДВЕРИ');
                                                                   
                                        return isValidField;
                                      });
                                      
                                      return filteredFields.map((field: string, index: number) => (
                                        <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                          {field}
                                        </th>
                                      ));
                                    }
                                  } catch (error) {
                                    console.error('Ошибка при обработке requiredFields шаблона:', error);
                                  }
                                }
                                
                                // Fallback: показываем базовые поля товаров
                                return (
                                  <>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                      Название
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                      Артикул
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                      Цена
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                      Остаток
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                      Бренд
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                      Модель
                                    </th>
                                  </>
                                );
                              })()}
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                                Есть фото
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Действия
                              </th>
                            </tr>
                          </thead>
                          
                          {/* Тело таблицы */}
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProducts.map((product: Product, index: number) => (
                              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 border-r border-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={selectedProducts.has(product.id)}
                                    onChange={(e) => handleProductSelect(product.id, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-500 border-r border-gray-200">
                                  {index + 1}
                                </td>
                                {/* Динамические ячейки свойств из requiredFields шаблона */}
                                {(() => {
                                  if (selectedTemplate?.requiredFields) {
                                    try {
                                      let requiredFields = selectedTemplate.requiredFields; // Уже парсится в API
                                      
                                      // Проверяем, что requiredFields является массивом
                                      if (typeof requiredFields === 'string') {
                                        requiredFields = JSON.parse(requiredFields);
                                      }
                                      
                                      const specifications = product.properties_data ? 
                                        (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
                                      
                                      
                                      if (Array.isArray(requiredFields) && requiredFields.length > 0) {
                                        // Исправляем кодировку полей
                                        const fixedFields = fixFieldsEncoding(requiredFields);
                                        
                                        // Фильтруем поля, исключая нежелательные и пустые
                                        const filteredFields = fixedFields.filter((field: string) => {
                                          return field && 
                                                 typeof field === 'string' &&
                                                 field.trim() !== '' && 
                                                 field !== '_' &&
                                                 !field.includes('№') && 
                                                 !field.includes('Domeo_Ссылка на фото двери') &&
                                                 !field.includes('DOMEO_ССЫЛКА НА ФОТО ДВЕРИ');
                                        });
                                        
                                        return filteredFields.map((field: string, fieldIndex: number) => {
                                          // Пробуем разные варианты названий полей для поиска значения
                                          let value = specifications[field] || '-';
                                          
                                          // Если значение не найдено, пробуем найти по частичному совпадению
                                          if (value === '-') {
                                            const keys = Object.keys(specifications);
                                            
                                            const matchingKey = keys.find(key => 
                                              key.toLowerCase().includes(field.toLowerCase()) ||
                                              field.toLowerCase().includes(key.toLowerCase())
                                            );
                                            
                                            if (matchingKey) {
                                              value = specifications[matchingKey];
                                            }
                                          }
                                          
                                          return (
                                            <td key={fieldIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">
                                              <div className="max-w-xs truncate" title={String(value)}>
                                                {value}
                                              </div>
                                            </td>
                                          );
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Ошибка при отображении полей товара:', error);
                                    }
                                  }
                                  
                                  // Fallback: показываем базовые поля товаров
                                  const properties = product.properties_data ? 
                                    (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
                                  // Показываем реальные свойства из properties_data
                                  const fallbackValues = [
                                    properties['Domeo_Название модели для Web'] || properties['Название'] || product.name || '-',
                                    properties['Артикул поставщика'] || properties['Артикул'] || product.sku || '-',
                                    properties['Цена ррц (включая цену полотна, короба, наличников, доборов)'] || properties['Цена'] || (product.base_price ? `${product.base_price} ₽` : '-'),
                                    properties['Склад/заказ'] || properties['Остаток'] || product.stock_quantity || 0,
                                    properties['Поставщик'] || properties['Бренд'] || product.brand || '-',
                                    properties['Модель поставщика'] || properties['Модель'] || product.model || '-'
                                  ];
                                  
                                  return (
                                    <>
                                      {fallbackValues.map((value, index) => (
                                        <td key={index} className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 border-r border-gray-200">
                                          <div className="max-w-xs truncate" title={String(value)}>
                                            {value}
                                          </div>
                                        </td>
                                      ))}
                                    </>
                                  );
                                })()}
                                {/* Ячейка "Есть фото" */}
                                <td className="px-3 py-2 whitespace-nowrap text-center border-r border-gray-200">
                                  {(() => {
                                    const specifications = product.properties_data ? 
                                      (typeof product.properties_data === 'string' ? JSON.parse(product.properties_data) : product.properties_data) : {};
                                    const hasPhotos = specifications.photos && Array.isArray(specifications.photos) && specifications.photos.length > 0;
                                    return hasPhotos ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        ✅ Есть
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        ❌ Нет
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => {
                                        // Редактировать товар
                                      }}
                                    >
                                      Редактировать
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs text-red-600 hover:text-red-700"
                                      onClick={() => {
                                        // Удалить товар
                                      }}
                                    >
                                      Удалить
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                        
                        {/* Улучшенный скроллбар */}
                        <div className="mt-2 bg-gray-100 rounded-lg p-2">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center space-x-4">
                              <span>📊 Всего: {totalProductsCount} товаров</span>
                              <span>👁️ Показано: {currentLoadedCount}</span>
                              <span>📄 Страница: {Math.ceil(currentLoadedCount / itemsPerPage)} из {Math.ceil(totalProductsCount / itemsPerPage)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>Горизонтальная прокрутка:</span>
                              <div className="flex space-x-1">
                                <button 
                                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                                  onClick={() => {
                                    const table = document.querySelector('.overflow-x-auto');
                                    if (table) table.scrollLeft -= 200;
                                  }}
                                >
                                  ←
                                </button>
                                <button 
                                  className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                                  onClick={() => {
                                    const table = document.querySelector('.overflow-x-auto');
                                    if (table) table.scrollLeft += 200;
                                  }}
                                >
                                  →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {currentLoadedCount < totalProductsCount && (
                        <div className="text-center pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600 mb-3">
                            Показано {currentLoadedCount} из {totalProductsCount} товаров
                          </p>
                          <div className="flex items-center justify-center space-x-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Дозагрузить еще товаров
                                if (selectedCategory) {
                                  loadCategoryProducts(selectedCategory.id, itemsPerPage, true);
                                }
                              }}
                              disabled={loadingMore}
                              className="flex items-center space-x-2"
                            >
                              {loadingMore ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                  <span>Загрузка...</span>
                                </>
                              ) : (
                                <>
                                  <span>Загрузить еще {Math.min(itemsPerPage, totalProductsCount - currentLoadedCount)}</span>
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Загрузить все оставшиеся товары
                                if (selectedCategory) {
                                  loadCategoryProducts(selectedCategory.id, totalProductsCount - currentLoadedCount, true);
                                }
                              }}
                              disabled={loadingMore}
                              className="flex items-center space-x-2"
                            >
                              {loadingMore ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                  <span>Загрузка...</span>
                                </>
                              ) : (
                                <>
                                  <span>Показать все ({totalProductsCount})</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">В этой категории нет товаров</h3>
                      <p className="text-gray-500 mb-4">Товары не были импортированы в эту категорию</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Переход к импорту товаров
                          window.location.href = `/admin/catalog/import?category=${selectedCategory.id}`;
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Импортировать товары
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Выберите категорию для просмотра списка товаров
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Диалог создания категории */}
      <CreateCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateCategory}
        parentId={newCategoryParent}
      />

      {/* Диалог редактирования категории */}
      <EditCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditCategory}
        category={categoryToEdit}
      />

      {/* Диалог удаления категории */}
      <DeleteCategoryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteCategory}
        category={categoryToDelete}
      />

      <BulkEditDialogWrapper
        isOpen={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        products={Array.from(selectedProducts).map(id => 
          filteredProducts.find(p => p.id === id)!
        ).filter(Boolean)}
        onSave={handleBulkEdit}
      />

    </div>
  );
}

// Компоненты диалогов
function CreateCategoryDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  parentId 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCatalogCategoryDto) => void;
  parentId?: string;
}) {
  const [formData, setFormData] = useState({
    name: '',
    sort_order: 0,
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', sort_order: 0, is_active: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать категорию</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название категории"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Порядок сортировки</label>
            <Input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium">Активна</label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">Создать</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  category 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCatalogCategoryDto) => void;
  category: CatalogCategory | null;
}) {
  const [formData, setFormData] = useState({
    name: '',
    sort_order: 0,
    is_active: true
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        sort_order: category.sort_order,
        is_active: category.is_active
      });
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать категорию</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название категории"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Порядок сортировки</label>
            <Input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_active_edit" className="text-sm font-medium">Активна</label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">Сохранить</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCategoryDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  category 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  category: CatalogCategory | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить категорию</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-600">
            Вы уверены, что хотите удалить категорию "{category?.name}"?
          </p>
          <p className="text-sm text-red-600">
            Это действие нельзя отменить. Все подкатегории и товары также будут удалены.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              Удалить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Компонент диалога массового редактирования
function BulkEditDialogWrapper({ 
  isOpen, 
  onClose, 
  products, 
  onSave 
}: {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSave: (updates: Array<{ id: string; updates: Partial<Product> }>) => Promise<void>;
}) {
  return (
    <BulkEditDialog
      isOpen={isOpen}
      onClose={onClose}
      products={products}
      onSave={onSave}
    />
  );
}
