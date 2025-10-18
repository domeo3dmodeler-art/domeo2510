'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Badge, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui';
import { Plus, Search, Edit, Trash2, Upload, Download, Eye, Package } from 'lucide-react';
import { CatalogCategory } from '@/lib/types/catalog';

interface Product {
  id: string;
  sku: string;
  name: string;
  catalog_category_id: string;
  properties_data: Record<string, any>;
  base_price: number;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  catalog_category: {
    id: string;
    name: string;
    level: number;
    path: string;
  };
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCategoryForImport, setSelectedCategoryForImport] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Загружаем категории каталога
      const categoriesRes = await fetch('/api/catalog/categories');
      const categoriesData = await categoriesRes.json();
      setCatalogCategories(categoriesData.categories || []);

      // Загружаем товары
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('catalogCategoryId', selectedCategory);

      const productsRes = await fetch(`/api/catalog/products?${params}`);
      const productsData: ProductsResponse = await productsRes.json();

      setProducts(productsData.products);
      setTotalPages(productsData.totalPages);
      setTotal(productsData.total);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Удалить товар "${product.name}"?`)) return;

    try {
      const response = await fetch(`/api/catalog/products/${product.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleDownloadTemplate = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/catalog/products/import/template?catalogCategoryId=${categoryId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product-template-${categoryId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleImportProducts = async (file: File, categoryId: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('catalogCategoryId', categoryId);

      const response = await fetch('/api/catalog/products/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert(`Успешно импортировано ${result.imported} товаров`);
        await loadData();
        setImportDialogOpen(false);
      } else {
        alert(`Ошибка импорта: ${result.message}`);
        if (result.errors && result.errors.length > 0) {
          console.error('Import errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Ошибка при импорте товаров');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка товаров...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            className="flex items-center space-x-1"
          >
            <Upload className="h-4 w-4" />
            <span>Импорт</span>
          </Button>
          <Button
            className="flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Добавить товар</span>
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск товаров..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все категории</SelectItem>
              {catalogCategories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name} (L{category.level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {total} товаров
            </span>
          </div>
        </div>
      </Card>

      {/* Список товаров */}
      <Card className="p-4">
        {products.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchTerm || selectedCategory ? 'Товары не найдены' : 'Товары не добавлены'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Остаток</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {Object.keys(product.properties_data).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {Object.entries(product.properties_data).slice(0, 2).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                {key}: {value}
                              </span>
                            ))}
                            {Object.keys(product.properties_data).length > 2 && '...'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.catalog_category.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatPrice(product.base_price, product.currency)}
                    </TableCell>
                    <TableCell>
                      <span className={product.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {product.stock_quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {product.is_active ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">Активен</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(product.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Показано {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, total)} из {total}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <span className="text-sm">
                Страница {currentPage} из {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Вперед
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Диалог импорта */}
      <ImportProductsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportProducts}
        catalogCategories={catalogCategories}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}

// Компонент диалога импорта
function ImportProductsDialog({ 
  open, 
  onOpenChange, 
  onImport,
  catalogCategories,
  onDownloadTemplate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, categoryId: string) => void;
  catalogCategories: CatalogCategory[];
  onDownloadTemplate: (categoryId: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setSelectedFile(file);
    } else {
      alert('Поддерживаются только файлы Excel (.xlsx, .xls)');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleSubmit = () => {
    if (!selectedFile || !selectedCategory) {
      alert('Выберите файл и категорию');
      return;
    }

    onImport(selectedFile, selectedCategory);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Импорт товаров из Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Категория каталога</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {catalogCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} (L{category.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownloadTemplate(selectedCategory)}
              >
                <Download className="h-4 w-4 mr-1" />
                Скачать шаблон
              </Button>
              <span className="text-sm text-gray-500">
                Скачайте шаблон для правильного формата данных
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Файл Excel</label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-green-600">✓ {selectedFile.name}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    Удалить
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <span className="text-blue-600">Нажмите для выбора</span> или перетащите файл
                  </div>
                  <div className="text-sm text-gray-500">
                    Поддерживаются файлы .xlsx, .xls
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Выбрать файл</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!selectedFile || !selectedCategory}
            >
              Импортировать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
