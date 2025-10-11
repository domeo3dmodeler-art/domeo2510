'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Badge, Textarea } from '../ui';
import { Download, Upload, FileText, AlertCircle, CheckCircle, Settings, Edit, Trash2, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';

interface TemplateManagerProps {
  categoryId: string;
  categoryName: string;
  template?: any;
  onTemplateUpdate?: (template: any) => void;
}

interface ImportResult {
  success: boolean;
  mode: string;
  total: number;
  valid: number;
  invalid: number;
  products: any[];
  errors: any[];
  template: any;
  fieldMapping: Record<string, number>;
}

export default function TemplateManager({
  categoryId,
  categoryName,
  template,
  onTemplateUpdate
}: TemplateManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importMode, setImportMode] = useState<'preview' | 'import'>('preview');
  const [errors, setErrors] = useState<string[]>([]);

  // Экспорт шаблона в Excel
  const handleExportTemplate = async () => {
    try {
      setLoading(true);
      
      const url = template?.id 
        ? `/api/admin/import-templates/export?templateId=${template.id}`
        : `/api/admin/import-templates/export?categoryId=${categoryId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Ошибка при экспорте шаблона');
      }
      
      // Создаем blob и скачиваем файл
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const fileName = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') 
        || `template_${categoryName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      link.download = decodeURIComponent(fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Export error:', error);
      setErrors(['Ошибка при экспорте шаблона']);
    } finally {
      setLoading(false);
    }
  };

  // Обработка загрузки файла
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
      setErrors([]);
    }
  };

  // Предварительный просмотр импорта
  const handlePreviewImport = async () => {
    if (!importFile) {
      setErrors(['Выберите файл для импорта']);
      return;
    }

    try {
      setLoading(true);
      setErrors([]);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('categoryId', categoryId);
      if (template?.id) {
        formData.append('templateId', template.id);
      }
      formData.append('mode', 'preview');

      const response = await fetch('/api/admin/import-templates/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        setImportMode('preview');
      } else {
        setErrors([result.error || 'Ошибка при предварительном просмотре']);
      }
    } catch (error) {
      console.error('Preview error:', error);
      setErrors(['Ошибка при предварительном просмотре']);
    } finally {
      setLoading(false);
    }
  };

  // Импорт товаров
  const handleImportProducts = async () => {
    if (!importFile) {
      setErrors(['Выберите файл для импорта']);
      return;
    }

    try {
      setLoading(true);
      setErrors([]);

      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('categoryId', categoryId);
      if (template?.id) {
        formData.append('templateId', template.id);
      }
      formData.append('mode', 'import');

      const response = await fetch('/api/admin/import-templates/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(result);
        setImportMode('import');
        
        // Уведомляем родительский компонент об обновлении
        if (onTemplateUpdate) {
          onTemplateUpdate(template);
        }
        
        // Показываем результат
        alert(`Импорт завершен!\nИмпортировано: ${result.imported} товаров\nОшибок: ${result.errors}`);
      } else {
        setErrors([result.error || 'Ошибка при импорте']);
      }
    } catch (error) {
      console.error('Import error:', error);
      setErrors(['Ошибка при импорте товаров']);
    } finally {
      setLoading(false);
    }
  };

  // Очистка результатов
  const handleClearResults = () => {
    setImportResult(null);
    setImportFile(null);
    setErrors([]);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-1"
      >
        <FileText className="h-4 w-4" />
        <span>Шаблон загрузки</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Шаблон загрузки - {categoryName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Информация о шаблоне */}
            {template ? (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Информация о шаблоне</h3>
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>
                    {template.is_active ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Название:</span> {template.name || 'Не указано'}
                  </div>
                  <div>
                    <span className="font-medium">Описание:</span> {template.description || 'Не указано'}
                  </div>
                  <div>
                    <span className="font-medium">Обязательных полей:</span> {template.requiredFields?.length || 0}
                  </div>
                  <div>
                    <span className="font-medium">Поля калькулятора:</span> {template.calculatorFields?.length || 0}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h3 className="font-semibold text-yellow-900">Шаблон не найден</h3>
                    <p className="text-sm text-yellow-700">
                      Для этой категории еще не создан шаблон импорта. Создайте шаблон в редакторе.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Экспорт шаблона */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Экспорт шаблона</h3>
                <Button
                  onClick={handleExportTemplate}
                  disabled={!template || loading}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Скачать Excel шаблон</span>
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                Скачайте шаблон в формате Excel, заполните его данными товаров и загрузите обратно.
              </p>
            </Card>

            {/* Импорт товаров */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Импорт товаров</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={handlePreviewImport}
                    disabled={!importFile || !template || loading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Предварительный просмотр
                  </Button>
                  <Button
                    onClick={handleImportProducts}
                    disabled={!importFile || !template || loading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Импортировать
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Выберите заполненный Excel файл
                  </label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {importFile && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Выбран файл: {importFile.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearResults}
                    >
                      Очистить
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Ошибки */}
            {errors.length > 0 && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Ошибки</h3>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Результаты импорта */}
            {importResult && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    {importMode === 'preview' ? 'Предварительный просмотр' : 'Результат импорта'}
                  </h3>
                  <Badge variant={importResult.success ? 'default' : 'error'}>
                    {importResult.success ? 'Успешно' : 'Ошибка'}
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.total}</div>
                    <div className="text-sm text-gray-600">Всего строк</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.valid}</div>
                    <div className="text-sm text-gray-600">Валидных</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.invalid}</div>
                    <div className="text-sm text-gray-600">С ошибками</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {importMode === 'import' ? importResult.valid : importResult.valid}
                    </div>
                    <div className="text-sm text-gray-600">
                      {importMode === 'import' ? 'Импортировано' : 'Готово к импорту'}
                    </div>
                  </div>
                </div>

                {/* Примеры товаров */}
                {importResult.products && importResult.products.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Примеры товаров:</h4>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Строка</th>
                            <th className="px-3 py-2 text-left">Название</th>
                            <th className="px-3 py-2 text-left">Артикул</th>
                            <th className="px-3 py-2 text-left">Цена</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.products.slice(0, 5).map((product, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">{product.rowNumber}</td>
                              <td className="px-3 py-2">
                                {product.specifications.name || product.specifications.Название || '-'}
                              </td>
                              <td className="px-3 py-2">
                                {product.specifications.sku || product.specifications.Артикул || '-'}
                              </td>
                              <td className="px-3 py-2">
                                {product.specifications.price || product.specifications.Цена || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Ошибки валидации */}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Ошибки валидации:</h4>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="p-2 border-b text-sm">
                          <div className="font-medium">Строка {error.rowNumber}:</div>
                          <div className="text-red-600">
                            {error.errors?.join(', ') || error.error}
                          </div>
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <div className="p-2 text-sm text-gray-500 text-center">
                          ... и еще {importResult.errors.length - 10} ошибок
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Кнопки действий */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
