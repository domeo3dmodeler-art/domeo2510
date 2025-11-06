// lib/documents/deduplication.ts
// Единая логика дедубликации документов

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging/logger';

// Нормализация items для сравнения
export function normalizeItems(items: any[]): any[] {
  return items.map(item => {
    const normalized: any = {
      type: String(item.type || 'door').toLowerCase(),
      style: String(item.style || '').toLowerCase().trim(),
      model: String(item.model || item.name || '').toLowerCase().trim(),
      finish: String(item.finish || '').toLowerCase().trim(),
      color: String(item.color || '').toLowerCase().trim(),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      quantity: Number(item.qty || item.quantity || 1),
      unitPrice: Number(item.unitPrice || item.price || 0),
      hardwareKitId: String(item.hardwareKitId || '').trim(),
      handleId: String(item.handleId || '').trim(),
      sku_1c: String(item.sku_1c || '').trim()
    };
    
    // Для ручек - сравниваем только handleId и quantity
    if (normalized.type === 'handle' || item.handleId) {
      return {
        type: 'handle',
        handleId: normalized.handleId,
        quantity: normalized.quantity,
        unitPrice: normalized.unitPrice
      };
    }
    
    return normalized;
  }).sort((a, b) => {
    const keyA = `${a.type}:${(a.handleId || a.model || '')}:${a.finish}:${a.color}:${a.width}:${a.height}:${a.hardwareKitId}`;
    const keyB = `${b.type}:${(b.handleId || b.model || '')}:${b.finish}:${b.color}:${b.width}:${b.height}:${b.hardwareKitId}`;
    return keyA.localeCompare(keyB);
  });
}

// Сравнение содержимого корзины
export function compareCartContent(items1: any[], items2String: string | null): boolean {
  try {
    if (!items2String) return false;
    
    const normalized1 = normalizeItems(items1);
    const parsed2 = JSON.parse(items2String);
    
    // cart_data может быть объектом { items: [...], total_amount: ... } или массивом
    const items2 = Array.isArray(parsed2) ? parsed2 : (parsed2.items || []);
    const normalized2 = normalizeItems(items2);
    
    if (normalized1.length !== normalized2.length) {
      logger.debug('Разное количество товаров', 'DEDUPLICATION', {
        count1: normalized1.length,
        count2: normalized2.length
      });
      return false;
    }
    
    for (let i = 0; i < normalized1.length; i++) {
      const item1 = normalized1[i];
      const item2 = normalized2[i];
      
      if (item1.type === 'handle' || item2.type === 'handle') {
        if (item1.type !== item2.type ||
            item1.handleId !== item2.handleId ||
            item1.quantity !== item2.quantity ||
            Math.abs(item1.unitPrice - item2.unitPrice) > 0.01) {
          logger.debug('Ручки не совпадают', 'DEDUPLICATION', { item1, item2 });
          return false;
        }
        continue;
      }
      
      if (item1.type !== item2.type || 
          item1.style !== item2.style ||
          item1.model !== item2.model ||
          item1.finish !== item2.finish ||
          item1.color !== item2.color ||
          item1.width !== item2.width ||
          item1.height !== item2.height ||
          item1.hardwareKitId !== item2.hardwareKitId ||
          item1.handleId !== item2.handleId ||
          item1.quantity !== item2.quantity ||
          Math.abs(item1.unitPrice - item2.unitPrice) > 0.01) {
        logger.debug('Товары не совпадают', 'DEDUPLICATION', { item1, item2 });
        return false;
      }
    }
    
    logger.debug('Содержимое корзины совпадает', 'DEDUPLICATION');
    return true;
  } catch (error) {
    logger.warn('Ошибка сравнения содержимого корзины', 'DEDUPLICATION', { error });
    return false;
  }
}

// Поиск существующего Order
export async function findExistingOrder(
  parentDocumentId: string | null,
  cartSessionId: string | null,
  clientId: string,
  items: any[],
  totalAmount: number
) {
  try {
    logger.debug('Поиск существующего заказа', 'DEDUPLICATION', {
      parentDocumentId: parentDocumentId || 'нет',
      cartSessionId: cartSessionId || 'нет',
      clientId,
      totalAmount
    });

    // ВАЖНО: Order - основной документ, parent_document_id всегда должен быть null
    let existingOrder = null;
    
    if (cartSessionId) {
      // Этап 1: Поиск по cart_session_id (если передан)
      existingOrder = await prisma.order.findFirst({
        where: {
          parent_document_id: null, // Order - основной документ
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' }
      });

      if (existingOrder && existingOrder.cart_data && compareCartContent(items, existingOrder.cart_data)) {
        logger.debug('Найден существующий заказ (по cart_session_id)', 'DEDUPLICATION', {
          orderNumber: existingOrder.number,
          orderId: existingOrder.id,
          cartSessionId
        });
        return existingOrder;
      }
    }

    // Этап 2: Поиск по содержимому корзины (независимо от cart_session_id)
    const candidates = await prisma.order.findMany({
      where: {
        parent_document_id: null, // Только основные Order из корзины
        client_id: clientId,
        total_amount: {
          gte: totalAmount - 0.01,
          lte: totalAmount + 0.01
        }
      } as any,
      orderBy: { created_at: 'desc' },
      take: 20 // Увеличиваем лимит для более тщательного поиска
    });

    logger.debug('Кандидаты для сравнения', 'DEDUPLICATION', {
      candidatesCount: candidates.length,
      clientId,
      totalAmount
    });

    for (const candidate of candidates) {
      if (candidate.cart_data && compareCartContent(items, candidate.cart_data)) {
        logger.debug('Найден существующий заказ (по содержимому корзины)', 'DEDUPLICATION', {
          orderNumber: candidate.number,
          orderId: candidate.id,
          cartSessionId: candidate.cart_session_id
        });
        return candidate;
      }
    }

    logger.debug('Существующий заказ не найден', 'DEDUPLICATION');
    return null;
  } catch (error) {
    logger.error('Ошибка поиска существующего заказа', 'DEDUPLICATION', { error });
    return null;
  }
}

// Поиск существующего документа (Quote, Invoice, SupplierOrder)
export async function findExistingDocument(
  type: 'quote' | 'invoice' | 'supplier_order',
  parentDocumentId: string | null,
  cartSessionId: string | null,
  clientId: string,
  items: any[],
  totalAmount: number
) {
  try {
    logger.debug('Поиск существующего документа', 'DEDUPLICATION', {
      type,
      parentDocumentId: parentDocumentId || 'нет',
      cartSessionId: cartSessionId || 'нет',
      clientId,
      totalAmount
    });

    // Этап 1: Строгий поиск по всем критериям
    let existing = null;
    
    if (type === 'quote') {
      existing = await prisma.quote.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: { created_at: 'desc' }
      });
    } else if (type === 'invoice') {
      existing = await prisma.invoice.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          client_id: clientId,
          total_amount: totalAmount
        } as any,
        orderBy: { created_at: 'desc' }
      });
    } else if (type === 'supplier_order') {
      existing = await prisma.supplierOrder.findFirst({
        where: {
          parent_document_id: parentDocumentId,
          cart_session_id: cartSessionId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' }
      });
    }
    
    if (existing && existing.cart_data && compareCartContent(items, existing.cart_data)) {
      logger.debug('Найден существующий документ (строгое совпадение)', 'DEDUPLICATION', {
        documentNumber: existing.number || existing.id,
        documentId: existing.id
      });
      return existing;
    }

    // Этап 2: Поиск по содержимому корзины
    // ВАЖНО: Ищем только в документах ТОГО ЖЕ клиента
    let candidates: any[] = [];
    
    if (type === 'quote') {
      candidates = await prisma.quote.findMany({
        where: {
          client_id: clientId,
          parent_document_id: parentDocumentId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
    } else if (type === 'invoice') {
      candidates = await prisma.invoice.findMany({
        where: {
          client_id: clientId,
          parent_document_id: parentDocumentId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
    } else if (type === 'supplier_order') {
      candidates = await prisma.supplierOrder.findMany({
        where: {
          parent_document_id: parentDocumentId,
          total_amount: {
            gte: totalAmount - 0.01,
            lte: totalAmount + 0.01
          }
        } as any,
        orderBy: { created_at: 'desc' },
        take: 10
      });
    }
    
    for (const candidate of candidates) {
      if (candidate.cart_data && compareCartContent(items, candidate.cart_data)) {
        logger.debug('Найден существующий документ (по содержимому)', 'DEDUPLICATION', {
          documentNumber: candidate.number || candidate.id,
          documentId: candidate.id
        });
        return candidate;
      }
    }
    
    logger.debug('Существующий документ не найден', 'DEDUPLICATION');
    return null;
  } catch (error) {
    logger.error('Ошибка поиска существующего документа', 'DEDUPLICATION', { error });
    return null;
  }
}

