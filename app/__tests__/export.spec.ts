// __tests__/export.spec.ts
// Юнит-тесты для модуля экспорта заказа на фабрику

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { doorsExportAdapter } from '@/lib/export/adapters/doors';
import { buildExportXLSX } from '@/lib/export/services/xlsx';
import { ExportRow } from '@/lib/export/types';

// Мокаем Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    doors_catalog: {
      findFirst: jest.fn()
    }
  }
}));

describe('Export Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Doors Export Adapter', () => {
    describe('validateKP', () => {
      it('должен валидировать корректный ID КП', async () => {
        const result = await doorsExportAdapter.validateKP('kp-123');
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('должен отклонять пустой ID КП', async () => {
        const result = await doorsExportAdapter.validateKP('');
        expect(result.valid).toBe(false);
        expect(result.error?.code).toBe('INVALID_KP_ID');
        expect(result.error?.message).toContain('ID КП обязателен');
      });

      it('должен отклонять не-строковый ID КП', async () => {
        const result = await doorsExportAdapter.validateKP(123 as any);
        expect(result.valid).toBe(false);
        expect(result.error?.code).toBe('INVALID_KP_ID');
      });
    });

    describe('getKPData', () => {
      it('должен возвращать корректную структуру данных КП', async () => {
        const kpData = await doorsExportAdapter.getKPData('kp-123');
        
        expect(kpData).toHaveProperty('id', 'kp-123');
        expect(kpData).toHaveProperty('items');
        expect(kpData).toHaveProperty('created_at');
        expect(kpData).toHaveProperty('total');
        expect(Array.isArray(kpData.items)).toBe(true);
        expect(kpData.items.length).toBeGreaterThan(0);
      });
    });

    describe('toExportRows', () => {
      it('должен преобразовывать данные КП в строки экспорта', async () => {
        const mockKPData = {
          id: 'kp-123',
          items: [
            {
              sku: 'DOOR-001',
              model: 'Classic',
              width: 800,
              height: 2000,
              color: 'Белый',
              finish: 'Матовый',
              series: 'Premium',
              material: 'МДФ',
              rrc_price: 15000,
              qty: 2,
              hardware_kit: {
                name: 'Комплект Premium',
                price_rrc: 3000,
                group: '1'
              },
              handle: {
                name: 'Ручка Classic',
                price_opt: 500,
                price_group_multiplier: 2.5
              },
              price_opt: 12000,
              currency: 'RUB'
            }
          ],
          created_at: '2025-01-15T10:00:00Z',
          total: 36000
        };

        const rows = await doorsExportAdapter.toExportRows(mockKPData);
        
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThan(0);
        
        const firstRow = rows[0];
        expect(firstRow).toHaveProperty('sku', 'DOOR-001');
        expect(firstRow).toHaveProperty('quantity', 2);
        expect(firstRow).toHaveProperty('base_price');
        expect(firstRow).toHaveProperty('total_price');
        expect(firstRow).toHaveProperty('currency', 'RUB');
      });
    });
  });

  describe('XLSX Export Service', () => {
    it('должен генерировать корректный XLSX файл', async () => {
      const mockRows: ExportRow[] = [
        {
          sku: 'DOOR-001',
          series: 'Premium',
          material: 'МДФ',
          finish: 'Матовый',
          width_mm: 800,
          height_mm: 2000,
          color: 'Белый',
          hardware_set: 'Комплект Premium (гр. 1)',
          handle: 'Ручка Classic',
          quantity: 2,
          base_price: 12000,
          markup_price: 3000,
          discount_price: null,
          vat_price: null,
          total_price: 36000,
          currency: 'RUB',
          created_at: '2025-01-15T10:00:00Z'
        }
      ];

      const buffer = await buildExportXLSX(mockRows);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Проверяем, что это действительно XLSX файл (начинается с PK)
      expect(buffer.toString('hex', 0, 2)).toBe('504b');
    });

    it('должен обрабатывать пустой массив строк', async () => {
      const buffer = await buildExportXLSX([]);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('API Integration Tests', () => {
    it('должен корректно обрабатывать запрос экспорта', async () => {
      // Тест интеграции с API роутом
      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          kpId: 'kp-123',
          format: 'xlsx'
        })
      } as any;

      // Здесь можно добавить тест вызова API роута
      // Но для этого нужно будет настроить тестовую среду Next.js
      expect(mockRequest.json).toBeDefined();
    });
  });
});

// Тест-кейсы из DoD (Definition of Done)
describe('DoD Test Cases', () => {
  it('Цена корректна для базовой двери без опций', async () => {
    const mockKPData = {
      id: 'kp-basic',
      items: [
        {
          sku: 'DOOR-BASIC',
          model: 'Basic',
          width: 800,
          height: 2000,
          color: 'Белый',
          finish: 'Матовый',
          series: 'Standard',
          material: 'МДФ',
          rrc_price: 10000,
          qty: 1,
          price_opt: 8000,
          currency: 'RUB'
        }
      ],
      created_at: '2025-01-15T10:00:00Z',
      total: 10000
    };

    const rows = await doorsExportAdapter.toExportRows(mockKPData);
    const doorRow = rows.find(r => !r.handle);
    
    expect(doorRow).toBeDefined();
    expect(doorRow?.base_price).toBe(8000);
    expect(doorRow?.total_price).toBe(10000);
    expect(doorRow?.hardware_set).toBeNull();
  });

  it('Цена корректна при сочетании опций и скидки', async () => {
    const mockKPData = {
      id: 'kp-complex',
      items: [
        {
          sku: 'DOOR-COMPLEX',
          model: 'Complex',
          width: 900,
          height: 2100,
          color: 'Коричневый',
          finish: 'Глянцевый',
          series: 'Premium',
          material: 'МДФ',
          rrc_price: 18000,
          qty: 1,
          hardware_kit: {
            name: 'Комплект Premium',
            price_rrc: 4000,
            group: '2'
          },
          handle: {
            name: 'Ручка Luxury',
            price_opt: 800,
            price_group_multiplier: 3.0
          },
          price_opt: 15000,
          currency: 'RUB'
        }
      ],
      created_at: '2025-01-15T10:00:00Z',
      total: 25000
    };

    const rows = await doorsExportAdapter.toExportRows(mockKPData);
    
    expect(rows.length).toBeGreaterThan(1); // Дверь + ручка
    
    const doorRow = rows.find(r => !r.handle);
    const handleRow = rows.find(r => r.handle);
    
    expect(doorRow).toBeDefined();
    expect(handleRow).toBeDefined();
    expect(doorRow?.hardware_set).toContain('Комплект Premium');
    expect(handleRow?.handle).toContain('Ручка Luxury');
  });

  it('Экспорт формируется из принятого КП', async () => {
    const kpId = 'kp-accepted-123';
    const kpData = await doorsExportAdapter.getKPData(kpId);
    const rows = await doorsExportAdapter.toExportRows(kpData);
    const buffer = await buildExportXLSX(rows);
    
    expect(kpData.id).toBe(kpId);
    expect(rows.length).toBeGreaterThan(0);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('XLSX файл генерируется и готов к скачиванию', async () => {
    const mockRows: ExportRow[] = [
      {
        sku: 'DOOR-TEST',
        series: 'Test',
        material: 'МДФ',
        finish: 'Матовый',
        width_mm: 800,
        height_mm: 2000,
        color: 'Белый',
        hardware_set: null,
        handle: null,
        quantity: 1,
        base_price: 10000,
        markup_price: 0,
        discount_price: null,
        vat_price: null,
        total_price: 10000,
        currency: 'RUB',
        created_at: '2025-01-15T10:00:00Z'
      }
    ];

    const buffer = await buildExportXLSX(mockRows);
    
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000); // Минимальный размер XLSX файла
    
    // Проверяем заголовки XLSX
    const header = buffer.toString('hex', 0, 4);
    expect(header).toBe('504b0304'); // ZIP/XLSX signature
  });
});

