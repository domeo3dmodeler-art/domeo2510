// lib/cart/cart-service.ts
// Сервис для управления корзиной калькулятора

import {
  Cart,
  CartItem,
  CartItemOption,
  CartItemModification,
  CartStatus,
  CartCalculation,
  CartValidationResult,
  CartValidationError,
  CartValidationWarning,
  ClientInfo,
  CartEvent,
  CartEventType,
  CartSettings,
  CartStats
} from './types';

export class CartService {
  private static instance: CartService;
  private cart: Cart;
  private settings: CartSettings;
  private listeners: Set<(cart: Cart) => void> = new Set();
  private eventListeners: Set<(event: CartEvent) => void> = new Set();

  private constructor() {
    this.settings = {
      autoSave: true,
      autoSaveInterval: 30,
      maxItems: 100,
      maxQuantity: 999,
      allowNegativeQuantities: false,
      defaultTaxRate: 20,
      currency: 'RUB',
      locale: 'ru-RU'
    };

    this.cart = this.createEmptyCart();
    this.initializeAutoSave();
  }

  static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  // Создание пустой корзины
  private createEmptyCart(): Cart {
    return {
      id: this.generateCartId(),
      items: [],
      subtotal: 0,
      discount: 0,
      discountType: 'percentage',
      discountValue: 0,
      deliveryCost: 0,
      installationCost: 0,
      tax: 0,
      taxRate: this.settings.defaultTaxRate,
      total: 0,
      status: CartStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Подписка на изменения корзины
  subscribe(listener: (cart: Cart) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Подписка на события корзины
  subscribeToEvents(listener: (event: CartEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  // Уведомление слушателей
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.cart);
      } catch (error) {
        console.error('Error in cart listener:', error);
      }
    });
  }

  // Уведомление слушателей событий
  private notifyEventListeners(event: CartEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in cart event listener:', error);
      }
    });
  }

  // Получение текущей корзины
  getCart(): Cart {
    return { ...this.cart };
  }

  // Добавление товара в корзину
  addItem(item: Omit<CartItem, 'id' | 'subtotal' | 'discount' | 'tax' | 'total' | 'addedAt' | 'updatedAt'>): CartItem {
    // Проверяем лимиты
    if (this.cart.items.length >= this.settings.maxItems) {
      throw new Error(`Превышен лимит товаров в корзине (${this.settings.maxItems})`);
    }

    if (item.quantity > this.settings.maxQuantity) {
      throw new Error(`Превышен лимит количества товара (${this.settings.maxQuantity})`);
    }

    // Проверяем, есть ли уже такой товар
    const existingItemIndex = this.cart.items.findIndex(
      cartItem => cartItem.productId === item.productId && 
      this.areItemsEqual(cartItem, item)
    );

    let cartItem: CartItem;

    if (existingItemIndex >= 0) {
      // Увеличиваем количество существующего товара
      cartItem = this.cart.items[existingItemIndex];
      cartItem.quantity += item.quantity;
      cartItem.updatedAt = new Date();
    } else {
      // Создаем новый товар в корзине
      cartItem = {
        ...item,
        id: this.generateItemId(),
        addedAt: new Date(),
        updatedAt: new Date()
      };
      this.cart.items.push(cartItem);
    }

    // Пересчитываем цены
    this.calculateItemPrices(cartItem);
    this.calculateCartTotals();

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.ITEM_ADDED,
      cartId: this.cart.id,
      itemId: cartItem.id,
      data: { item: cartItem },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();

    return cartItem;
  }

  // Обновление товара в корзине
  updateItem(itemId: string, updates: Partial<CartItem>): CartItem {
    const itemIndex = this.cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Товар не найден в корзине');
    }

    const cartItem = this.cart.items[itemIndex];
    const updatedItem = { ...cartItem, ...updates, updatedAt: new Date() };

    // Проверяем лимиты
    if (updates.quantity && updates.quantity > this.settings.maxQuantity) {
      throw new Error(`Превышен лимит количества товара (${this.settings.maxQuantity})`);
    }

    this.cart.items[itemIndex] = updatedItem;
    this.calculateItemPrices(updatedItem);
    this.calculateCartTotals();

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.ITEM_UPDATED,
      cartId: this.cart.id,
      itemId: updatedItem.id,
      data: { updates, item: updatedItem },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();

    return updatedItem;
  }

  // Удаление товара из корзины
  removeItem(itemId: string): void {
    const itemIndex = this.cart.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error('Товар не найден в корзине');
    }

    const removedItem = this.cart.items[itemIndex];
    this.cart.items.splice(itemIndex, 1);
    this.calculateCartTotals();

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.ITEM_REMOVED,
      cartId: this.cart.id,
      itemId: removedItem.id,
      data: { item: removedItem },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();
  }

  // Изменение количества товара
  updateQuantity(itemId: string, quantity: number): CartItem {
    if (quantity <= 0 && !this.settings.allowNegativeQuantities) {
      this.removeItem(itemId);
      return this.cart.items[0]; // Возвращаем первый товар для совместимости
    }

    return this.updateItem(itemId, { quantity });
  }

  // Добавление опции к товару
  addOption(itemId: string, option: CartItemOption): CartItem {
    const cartItem = this.cart.items.find(item => item.id === itemId);
    if (!cartItem) {
      throw new Error('Товар не найден в корзине');
    }

    // Удаляем существующую опцию с таким же ID
    cartItem.options = cartItem.options.filter(opt => opt.id !== option.id);
    cartItem.options.push(option);

    this.calculateItemPrices(cartItem);
    this.calculateCartTotals();

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.OPTION_CHANGED,
      cartId: this.cart.id,
      itemId: cartItem.id,
      data: { option, item: cartItem },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();

    return cartItem;
  }

  // Добавление модификации к товару
  addModification(itemId: string, modification: CartItemModification): CartItem {
    const cartItem = this.cart.items.find(item => item.id === itemId);
    if (!cartItem) {
      throw new Error('Товар не найден в корзине');
    }

    // Удаляем существующую модификацию с таким же ID
    cartItem.modifications = cartItem.modifications.filter(mod => mod.id !== modification.id);
    cartItem.modifications.push(modification);

    this.calculateItemPrices(cartItem);
    this.calculateCartTotals();

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.MODIFICATION_CHANGED,
      cartId: this.cart.id,
      itemId: cartItem.id,
      data: { modification, item: cartItem },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();

    return cartItem;
  }

  // Применение скидки
  applyDiscount(type: 'percentage' | 'fixed', value: number): void {
    this.cart.discountType = type;
    this.cart.discountValue = value;
    this.calculateCartTotals();

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.DISCOUNT_APPLIED,
      cartId: this.cart.id,
      data: { type, value },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();
  }

  // Обновление информации о клиенте
  updateClientInfo(clientInfo: ClientInfo): void {
    this.cart.clientInfo = clientInfo;

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.CLIENT_INFO_UPDATED,
      cartId: this.cart.id,
      data: { clientInfo },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();
  }

  // Очистка корзины
  clearCart(): void {
    const itemCount = this.cart.items.length;
    this.cart.items = [];
    this.calculateCartTotals();

    // Создаем событие
    const event: CartEvent = {
      type: CartEventType.CART_CLEARED,
      cartId: this.cart.id,
      data: { itemCount },
      timestamp: new Date()
    };

    this.notifyEventListeners(event);
    this.notifyListeners();
  }

  // Валидация корзины
  validateCart(): CartValidationResult {
    const errors: CartValidationError[] = [];
    const warnings: CartValidationWarning[] = [];

    // Проверяем каждый товар
    this.cart.items.forEach(item => {
      // Проверяем обязательные поля
      if (!item.productName) {
        errors.push({
          itemId: item.id,
          field: 'productName',
          message: 'Название товара обязательно',
          type: 'required'
        });
      }

      if (item.quantity <= 0) {
        errors.push({
          itemId: item.id,
          field: 'quantity',
          message: 'Количество должно быть больше 0',
          type: 'invalid'
        });
      }

      if (item.basePrice <= 0) {
        errors.push({
          itemId: item.id,
          field: 'basePrice',
          message: 'Базовая цена должна быть больше 0',
          type: 'invalid'
        });
      }

      // Проверяем обязательные опции
      item.options.forEach(option => {
        if (option.required && !option.value) {
          errors.push({
            itemId: item.id,
            field: `option_${option.id}`,
            message: `Опция "${option.name}" обязательна`,
            type: 'required'
          });
        }
      });
    });

    // Проверяем информацию о клиенте для определенных статусов
    if (this.cart.status !== CartStatus.DRAFT && !this.cart.clientInfo?.name) {
      warnings.push({
        field: 'clientInfo',
        message: 'Рекомендуется указать информацию о клиенте',
        type: 'recommendation'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Расчет цен товара
  private calculateItemPrices(item: CartItem): void {
    let subtotal = item.basePrice * item.quantity;

    // Добавляем стоимость опций
    item.options.forEach(option => {
      subtotal += option.price * item.quantity;
    });

    // Применяем модификации
    let finalPrice = subtotal;
    item.modifications.forEach(modification => {
      finalPrice *= modification.priceMultiplier;
      finalPrice += modification.priceAdd * item.quantity;
    });

    // Рассчитываем налоги и скидки
    const discount = 0; // Пока без скидок на отдельные товары
    const tax = (finalPrice - discount) * (this.cart.taxRate / 100);

    item.subtotal = subtotal;
    item.discount = discount;
    item.tax = tax;
    item.total = finalPrice - discount + tax;
  }

  // Расчет общих итогов корзины
  private calculateCartTotals(): void {
    this.cart.subtotal = this.cart.items.reduce((sum, item) => sum + item.subtotal, 0);

    // Применяем скидку на корзину
    if (this.cart.discountType === 'percentage') {
      this.cart.discount = this.cart.subtotal * (this.cart.discountValue / 100);
    } else {
      this.cart.discount = Math.min(this.cart.discountValue, this.cart.subtotal);
    }

    // Рассчитываем налог
    const taxableAmount = this.cart.subtotal - this.cart.discount + this.cart.deliveryCost + this.cart.installationCost;
    this.cart.tax = taxableAmount * (this.cart.taxRate / 100);

    // Итоговая сумма
    this.cart.total = this.cart.subtotal - this.cart.discount + this.cart.deliveryCost + this.cart.installationCost + this.cart.tax;

    this.cart.updatedAt = new Date();
  }

  // Получение детального расчета
  getCalculation(): CartCalculation {
    const itemsSubtotal = this.cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsDiscount = this.cart.items.reduce((sum, item) => sum + item.discount, 0);
    const itemsTax = this.cart.items.reduce((sum, item) => sum + item.tax, 0);
    const itemsTotal = this.cart.items.reduce((sum, item) => sum + item.total, 0);

    const optionsValue = this.cart.items.reduce((sum, item) => 
      sum + item.options.reduce((optSum, opt) => optSum + opt.price * item.quantity, 0), 0
    );

    const modificationsValue = this.cart.items.reduce((sum, item) => 
      sum + item.modifications.reduce((modSum, mod) => modSum + mod.priceAdd * item.quantity, 0), 0
    );

    return {
      items: {
        subtotal: itemsSubtotal,
        discount: itemsDiscount,
        tax: itemsTax,
        total: itemsTotal
      },
      cart: {
        subtotal: this.cart.subtotal,
        discount: this.cart.discount,
        delivery: this.cart.deliveryCost,
        installation: this.cart.installationCost,
        tax: this.cart.tax,
        total: this.cart.total
      },
      breakdown: {
        baseItems: itemsSubtotal - optionsValue,
        options: optionsValue,
        modifications: modificationsValue,
        discounts: this.cart.discount,
        delivery: this.cart.deliveryCost,
        installation: this.cart.installationCost,
        tax: this.cart.tax
      }
    };
  }

  // Вспомогательные методы
  private generateCartId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private areItemsEqual(item1: CartItem, item2: Partial<CartItem>): boolean {
    // Простое сравнение для демонстрации
    return item1.productId === item2.productId &&
           JSON.stringify(item1.options) === JSON.stringify(item2.options) &&
           JSON.stringify(item1.modifications) === JSON.stringify(item2.modifications);
  }

  // Автосохранение
  private initializeAutoSave(): void {
    if (this.settings.autoSave) {
      setInterval(() => {
        this.saveToStorage();
      }, this.settings.autoSaveInterval * 1000);
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cart_data', JSON.stringify(this.cart));
    }
  }

  // Загрузка из хранилища
  loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const savedCart = localStorage.getItem('cart_data');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          this.cart = {
            ...parsedCart,
            createdAt: new Date(parsedCart.createdAt),
            updatedAt: new Date(parsedCart.updatedAt)
          };
          this.notifyListeners();
        } catch (error) {
          console.error('Error loading cart from storage:', error);
        }
      }
    }
  }
}



