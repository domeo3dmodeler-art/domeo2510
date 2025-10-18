'use client';

import React, { useState, useEffect } from 'react';
import { Button, Card, Badge, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Checkbox } from '../../../../components/ui';
import { Plus, Search, Edit, Trash2, CheckCircle, XCircle, AlertCircle, FileText, Calculator, Download, Upload, Settings } from 'lucide-react';
import { ProductProperty, PropertyType, CreateProductPropertyDto, CatalogCategory, CategoryPropertyAssignment } from '@/lib/types/catalog';

type TabType = 'properties' | 'moderation' | 'assignments' | 'templates';

export default function PropertiesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  
  // Состояние для свойств товаров
  const [properties, setProperties] = useState<ProductProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<ProductProperty | null>(null);

  // Состояние для модерации
  const [selectedProperty, setSelectedProperty] = useState<ProductProperty | null>(null);
  const [moderateDialogOpen, setModerateDialogOpen] = useState(false);

  // Состояние для назначений
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [assignments, setAssignments] = useState<CategoryPropertyAssignment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentToEdit, setAssignmentToEdit] = useState<CategoryPropertyAssignment | null>(null);

  // Состояние для шаблонов
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [propertiesRes, categoriesRes, templatesRes] = await Promise.all([
        fetch('/api/catalog/properties'),
        fetch('/api/catalog/categories'),
        fetch('/api/catalog/templates')
      ]);

      const propertiesData = await propertiesRes.json();
      const categoriesData = await categoriesRes.json();
      const templatesData = await templatesRes.json();

      setProperties(propertiesData.properties || []);
      setCategories(categoriesData.categories || []);
      setTemplates(templatesData.templates || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await fetch('/api/catalog/properties');
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const handleCreateProperty = async (data: CreateProductPropertyDto) => {
    try {
      const response = await fetch('/api/catalog/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await loadProperties();
        setCreateDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating property:', error);
    }
  };

  const handleEditProperty = async (data: CreateProductPropertyDto) => {
    if (!propertyToEdit) return;

    try {
      const response = await fetch(`/api/catalog/properties/${propertyToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await loadProperties();
        setEditDialogOpen(false);
        setPropertyToEdit(null);
      }
    } catch (error) {
      console.error('Error updating property:', error);
    }
  };

  const handleDeleteProperty = async (property: ProductProperty) => {
    if (!confirm(`Удалить свойство "${property.name}"?`)) return;

    try {
      const response = await fetch(`/api/catalog/properties/${property.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadProperties();
      }
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  };

  const getPropertyTypeLabel = (type: PropertyType): string => {
    const labels = {
      text: 'Текст',
      number: 'Число',
      select: 'Список',
      boolean: 'Да/Нет',
      date: 'Дата',
      file: 'Файл'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (property: ProductProperty) => {
    if (!property.is_active) {
      return <Badge variant="secondary">Неактивно</Badge>;
    }
    
    // Здесь можно добавить логику определения статуса модерации
    // Пока просто показываем активные свойства
    return <Badge variant="default">Активно</Badge>;
  };

  // Функции для модерации
  const handleModerateProperty = (property: ProductProperty) => {
    setSelectedProperty(property);
    setModerateDialogOpen(true);
  };

  const handleModerationComplete = async (data: any) => {
    try {
      const response = await fetch(`/api/catalog/properties/${selectedProperty?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await loadProperties();
        setModerateDialogOpen(false);
        setSelectedProperty(null);
      }
    } catch (error) {
      console.error('Error updating property moderation:', error);
    }
  };

  // Функции для назначений
  const loadAssignments = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/catalog/categories/${categoryId}`);
      const data = await response.json();
      setAssignments(data.property_assignments || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      loadAssignments(categoryId);
    }
  };

  // Функции для шаблонов
  const handleCreateTemplate = async (data: any) => {
    try {
      const response = await fetch('/api/catalog/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await loadData();
        setTemplateDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleEditTemplate = (template: any) => {
    setTemplateToEdit(template);
    setTemplateDialogOpen(true);
  };

  const handleUpdateTemplate = async (data: any) => {
    try {
      const response = await fetch(`/api/catalog/templates/${templateToEdit?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        await loadData();
        setTemplateDialogOpen(false);
        setTemplateToEdit(null);
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (template: any) => {
    if (!confirm(`Удалить шаблон "${template.name}"?`)) return;

    try {
      const response = await fetch(`/api/catalog/templates/${template.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDownloadTemplate = async (template: any) => {
    try {
      const requiredFields = JSON.parse(template.required_fields || '[]');
      const calculatorFields = JSON.parse(template.calculator_fields || '[]');
      const exportFields = JSON.parse(template.export_fields || '[]');
      
      // Создаем заголовки для Excel
      const headers = [
        'Название товара',
        'Артикул',
        'Цена',
        ...requiredFields,
        ...calculatorFields.filter((field: string) => !requiredFields.includes(field)),
        ...exportFields.filter((field: string) => !requiredFields.includes(field) && !calculatorFields.includes(field))
      ];

      // Создаем пустые строки для заполнения
      const emptyRows = Array(10).fill(null).map(() => 
        headers.map(() => '')
      );

      const data = [headers, ...emptyRows];

      // Создаем Excel файл
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Шаблон');

      // Скачиваем файл
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}_шаблон.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || property.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && property.is_active) ||
      (filterStatus === 'inactive' && !property.is_active);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка свойств...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'properties', label: 'Свойства товаров', icon: FileText },
            { id: 'moderation', label: 'Модерация', icon: CheckCircle },
            { id: 'assignments', label: 'Назначения', icon: Settings },
            { id: 'templates', label: 'Шаблоны', icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Контент вкладок */}
      {activeTab === 'properties' && (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить свойство</span>
            </Button>
          </div>

          {/* Фильтры */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Поиск свойств..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Тип свойства" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="text">Текст</SelectItem>
              <SelectItem value="number">Число</SelectItem>
              <SelectItem value="select">Список</SelectItem>
              <SelectItem value="boolean">Да/Нет</SelectItem>
              <SelectItem value="date">Дата</SelectItem>
              <SelectItem value="file">Файл</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активные</SelectItem>
              <SelectItem value="inactive">Неактивные</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-600">
              {properties.filter(p => p.is_active).length} активных
            </span>
          </div>
            </div>
          </Card>

          {/* Список свойств */}
          <Card className="p-4">
            <div className="space-y-2">
          {filteredProperties.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? 'Свойства не найдены' 
                : 'Свойства не добавлены'
              }
            </div>
          ) : (
            filteredProperties.map(property => (
              <div
                key={property.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium">{property.name}</h3>
                    <Badge variant="outline">{getPropertyTypeLabel(property.type)}</Badge>
                    {getStatusBadge(property)}
                    {property.is_required && (
                      <Badge variant="destructive">Обязательное</Badge>
                    )}
                  </div>
                  {property.description && (
                    <p className="text-sm text-gray-600 mt-1">{property.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>ID: {property.id}</span>
                    <span>Создано: {new Date(property.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPropertyToEdit(property);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProperty(property)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
            </div>
          </Card>

          {/* Диалог создания свойства */}
          <CreatePropertyDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSubmit={handleCreateProperty}
          />

          {/* Диалог редактирования свойства */}
          <EditPropertyDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSubmit={handleEditProperty}
            property={propertyToEdit}
          />
        </div>
      )}

      {/* Вкладка модерации */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="text-center text-gray-500 py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Модерация свойств</p>
            <p className="text-sm">Функция модерации будет добавлена</p>
          </div>
        </div>
      )}

      {/* Вкладка назначений */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="text-center text-gray-500 py-8">
            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Назначение свойств</p>
            <p className="text-sm">Функция назначения будет добавлена</p>
          </div>
        </div>
      )}

      {/* Вкладка шаблонов */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Шаблоны загрузки</h3>
            <Button
              onClick={() => setTemplateDialogOpen(true)}
              className="flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Создать шаблон</span>
            </Button>
          </div>

          <Card className="p-4">
            <div className="space-y-2">
              {templates.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Download className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Шаблоны не созданы</p>
                  <p className="text-sm">Создайте шаблон для загрузки товаров</p>
                </div>
              ) : (
                templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge variant="outline">{template.catalog_category.name}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Создано: {new Date(template.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadTemplate(template)}
                        title="Скачать шаблон Excel"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-red-600 hover:text-red-700"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Диалог создания/редактирования шаблона */}
          <TemplateDialog
            open={templateDialogOpen}
            onOpenChange={setTemplateDialogOpen}
            onSubmit={templateToEdit ? handleUpdateTemplate : handleCreateTemplate}
            template={templateToEdit}
            categories={categories}
          />
        </div>
      )}
    </div>
  );
}

// Компоненты диалогов
function CreatePropertyDialog({ 
  open, 
  onOpenChange, 
  onSubmit 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProductPropertyDto) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as PropertyType,
    description: '',
    options: [] as string[],
    is_required: false,
    is_active: true
  });
  const [newOption, setNewOption] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      type: 'text',
      description: '',
      options: [],
      is_required: false,
      is_active: true
    });
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()]
      });
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать свойство</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название свойства"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Тип</label>
            <Select value={formData.type} onValueChange={(value: PropertyType) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Текст</SelectItem>
                <SelectItem value="number">Число</SelectItem>
                <SelectItem value="select">Список</SelectItem>
                <SelectItem value="boolean">Да/Нет</SelectItem>
                <SelectItem value="date">Дата</SelectItem>
                <SelectItem value="file">Файл</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание свойства (необязательно)"
            />
          </div>

          {formData.type === 'select' && (
            <div>
              <label className="block text-sm font-medium mb-1">Варианты выбора</label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Добавить вариант"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  />
                  <Button type="button" onClick={addOption} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{option}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_required" className="text-sm font-medium">Обязательное поле</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium">Активно</label>
            </div>
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

function EditPropertyDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  property 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProductPropertyDto) => void;
  property: ProductProperty | null;
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as PropertyType,
    description: '',
    options: [] as string[],
    is_required: false,
    is_active: true
  });
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        type: property.type,
        description: property.description || '',
        options: property.options ? JSON.parse(property.options) : [],
        is_required: property.is_required,
        is_active: property.is_active
      });
    }
  }, [property]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        options: [...formData.options, newOption.trim()]
      });
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать свойство</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название свойства"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Тип</label>
            <Select value={formData.type} onValueChange={(value: PropertyType) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Текст</SelectItem>
                <SelectItem value="number">Число</SelectItem>
                <SelectItem value="select">Список</SelectItem>
                <SelectItem value="boolean">Да/Нет</SelectItem>
                <SelectItem value="date">Дата</SelectItem>
                <SelectItem value="file">Файл</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание свойства (необязательно)"
            />
          </div>

          {formData.type === 'select' && (
            <div>
              <label className="block text-sm font-medium mb-1">Варианты выбора</label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Добавить вариант"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  />
                  <Button type="button" onClick={addOption} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{option}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_required_edit"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_required_edit" className="text-sm font-medium">Обязательное поле</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active_edit"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active_edit" className="text-sm font-medium">Активно</label>
            </div>
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

// Диалог создания/редактирования шаблона
function TemplateDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  template, 
  categories 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  template?: any;
  categories: CatalogCategory[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    catalog_category_id: '',
    required_fields: [] as string[],
    calculator_fields: [] as string[],
    export_fields: [] as string[]
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        catalog_category_id: template.catalog_category_id,
        required_fields: JSON.parse(template.required_fields || '[]'),
        calculator_fields: JSON.parse(template.calculator_fields || '[]'),
        export_fields: JSON.parse(template.export_fields || '[]')
      });
    } else {
      setFormData({
        name: '',
        catalog_category_id: '',
        required_fields: [],
        calculator_fields: [],
        export_fields: []
      });
    }
  }, [template, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Редактировать шаблон' : 'Создать шаблон'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название шаблона</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название шаблона"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Категория каталога</label>
            <Select 
              value={formData.catalog_category_id} 
              onValueChange={(value) => setFormData({ ...formData, catalog_category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!template && (
            <div className="text-sm text-gray-600">
              <p>Шаблон будет создан на основе настроек обязательных полей из конфигуратора.</p>
              <p>Дополнительные настройки можно будет изменить после создания.</p>
            </div>
          )}

          {template && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Обязательные поля</label>
                <div className="space-y-2">
                  {formData.required_fields.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={field}
                        onChange={(e) => {
                          const newFields = [...formData.required_fields];
                          newFields[index] = e.target.value;
                          setFormData({ ...formData, required_fields: newFields });
                        }}
                        placeholder="Название поля"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFields = formData.required_fields.filter((_, i) => i !== index);
                          setFormData({ ...formData, required_fields: newFields });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, required_fields: [...formData.required_fields, ''] });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить поле
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Поля для калькулятора</label>
                <div className="space-y-2">
                  {formData.calculator_fields.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={field}
                        onChange={(e) => {
                          const newFields = [...formData.calculator_fields];
                          newFields[index] = e.target.value;
                          setFormData({ ...formData, calculator_fields: newFields });
                        }}
                        placeholder="Название поля"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFields = formData.calculator_fields.filter((_, i) => i !== index);
                          setFormData({ ...formData, calculator_fields: newFields });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, calculator_fields: [...formData.calculator_fields, ''] });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить поле
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Поля для экспорта</label>
                <div className="space-y-2">
                  {formData.export_fields.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={field}
                        onChange={(e) => {
                          const newFields = [...formData.export_fields];
                          newFields[index] = e.target.value;
                          setFormData({ ...formData, export_fields: newFields });
                        }}
                        placeholder="Название поля"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFields = formData.export_fields.filter((_, i) => i !== index);
                          setFormData({ ...formData, export_fields: newFields });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({ ...formData, export_fields: [...formData.export_fields, ''] });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить поле
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {template ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
