// lib/export/ExportService.ts
// Единый сервис для экспорта документов

export interface CartItem {
  productId: number;
  qty?: number;
  kitId?: string;
  handleId?: string;
  model?: string;
  width?: number;
  height?: number;
  color?: string;
  finish?: string;
  type?: string;
}

export interface ExportOptions {
  format: 'html' | 'pdf' | 'csv' | 'xlsx';
  filename?: string;
  openInNewTab?: boolean;
}

export interface ExportResult {
  success: boolean;
  error?: string;
  filename?: string;
  url?: string;
}

export class ExportService {
  private static instance: ExportService;
  
  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Экспорт коммерческого предложения
   */
  async exportKP(
    cart: CartItem[], 
    options: ExportOptions = { format: 'html' }
  ): Promise<ExportResult> {
    if (!cart.length) {
      return { success: false, error: 'Корзина пуста' };
    }

    try {
      const response = await this.makeRequest('/api/cart/export/doors/kp', {
        cart: { items: cart }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Ошибка сервера');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const blob = await response.blob();
      const filename = options.filename || `kp_${new Date().toISOString().slice(0, 10)}.html`;
      
      return this.handleFileDownload(blob, filename, options);
    } catch (error: any) {
      return { success: false, error: error.message || 'Ошибка экспорта КП' };
    }
  }

  /**
   * Экспорт счета
   */
  async exportInvoice(
    cart: CartItem[], 
    options: ExportOptions = { format: 'html' }
  ): Promise<ExportResult> {
    if (!cart.length) {
      return { success: false, error: 'Корзина пуста' };
    }

    try {
      const response = await this.makeRequest('/api/cart/export/doors/invoice', {
        cart: { items: cart }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Ошибка сервера');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const blob = await response.blob();
      const filename = options.filename || `invoice_${new Date().toISOString().slice(0, 10)}.html`;
      
      return this.handleFileDownload(blob, filename, options);
    } catch (error: any) {
      return { success: false, error: error.message || 'Ошибка экспорта счета' };
    }
  }

  /**
   * Экспорт заказа на фабрику (CSV)
   */
  async exportFactoryCSV(
    cart: CartItem[], 
    options: ExportOptions = { format: 'csv' }
  ): Promise<ExportResult> {
    if (!cart.length) {
      return { success: false, error: 'Корзина пуста' };
    }

    try {
      const response = await this.makeRequest('/api/cart/export/doors/factory', {
        cart: { items: cart }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Ошибка сервера');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const blob = await response.blob();
      const filename = options.filename || `factory_${new Date().toISOString().slice(0, 10)}.csv`;
      
      return this.handleFileDownload(blob, filename, options);
    } catch (error: any) {
      return { success: false, error: error.message || 'Ошибка экспорта заказа на фабрику' };
    }
  }

  /**
   * Экспорт заказа на фабрику (XLSX)
   */
  async exportFactoryXLSX(
    cart: CartItem[], 
    options: ExportOptions = { format: 'xlsx' }
  ): Promise<ExportResult> {
    if (!cart.length) {
      return { success: false, error: 'Корзина пуста' };
    }

    try {
      const response = await this.makeRequest('/api/cart/export/doors/factory/xlsx', {
        cart: { items: cart }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Ошибка сервера');
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const blob = await response.blob();
      const filename = options.filename || `factory_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      return this.handleFileDownload(blob, filename, options);
    } catch (error: any) {
      return { success: false, error: error.message || 'Ошибка экспорта заказа на фабрику' };
    }
  }

  /**
   * Экспорт заказа на фабрику из принятого КП
   */
  async exportOrderFromKP(
    kpId: string, 
    options: ExportOptions = { format: 'xlsx' }
  ): Promise<ExportResult> {
    if (!kpId) {
      return { success: false, error: 'Необходимо указать ID КП' };
    }

    try {
      const response = await this.makeRequest('/api/export/order', {
        kpId,
        format: options.format
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { success: false, error: errorData.error || `HTTP ${response.status}` };
      }

      const blob = await response.blob();
      const filename = options.filename || `factory_order_${kpId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      return this.handleFileDownload(blob, filename, options);
    } catch (error: any) {
      return { success: false, error: error.message || 'Ошибка экспорта заказа на фабрику' };
    }
  }

  /**
   * Универсальный метод экспорта
   */
  async export(
    type: 'kp' | 'invoice' | 'factory-csv' | 'factory-xlsx' | 'order-from-kp',
    cart: CartItem[],
    kpId?: string,
    options: ExportOptions = { format: 'html' }
  ): Promise<ExportResult> {
    switch (type) {
      case 'kp':
        return this.exportKP(cart, options);
      case 'invoice':
        return this.exportInvoice(cart, options);
      case 'factory-csv':
        return this.exportFactoryCSV(cart, options);
      case 'factory-xlsx':
        return this.exportFactoryXLSX(cart, options);
      case 'order-from-kp':
        if (!kpId) {
          return { success: false, error: 'Необходимо указать ID КП' };
        }
        return this.exportOrderFromKP(kpId, options);
      default:
        return { success: false, error: 'Неизвестный тип экспорта' };
    }
  }

  /**
   * Вспомогательный метод для HTTP запросов
   */
  private async makeRequest(url: string, body: any): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  /**
   * Обработка скачивания файла
   */
  private handleFileDownload(
    blob: Blob, 
    filename: string, 
    options: ExportOptions
  ): ExportResult {
    try {
      const url = URL.createObjectURL(blob);

      if (options.openInNewTab && options.format === 'html') {
        // Открыть в новой вкладке
        window.open(url, '_blank', 'noopener,noreferrer');
        // Освободить URL через 10 секунд
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return { success: true, url, filename };
      } else {
        // Скачать файл
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return { success: true, filename };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Ошибка скачивания файла' };
    }
  }
}

// Экспорт singleton instance
export const exportService = ExportService.getInstance();
