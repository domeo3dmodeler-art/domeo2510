// __tests__/export-integration.spec.ts
// Интеграционные тесты для API роута экспорта заказа на фабрику

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/api/export/order/route';

// Мокаем Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    quote: {
      findFirst: jest.fn()
    },
    doors_catalog: {
      findFirst: jest.fn()
    }
  }
}));

// Мокаем модули экспорта
jest.mock('@/lib/export/registry', () => ({
  getExportAdapter: jest.fn(() => ({
    validateKP: jest.fn(),
    getKPData: jest.fn(),
    toExportRows: jest.fn()
  }))
}));

jest.mock('@/lib/export/services/xlsx', () => ({
  buildExportXLSX: jest.fn(() => Promise.resolve(Buffer.from('mock-xlsx-data'))),
  getExportFilename: jest.fn(() => 'factory_order_test_2025-01-15.xlsx'),
  getExportMimeType: jest.fn(() => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}));

describe('Export Order API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/export/order', () => {
    it('должен успешно экспортировать заказ на фабрику', async () => {
      const mockAdapter = {
        validateKP: jest.fn().mockResolvedValue({ valid: true }),
        getKPData: jest.fn().mockResolvedValue({
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
        }),
        toExportRows: jest.fn().mockResolvedValue([
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
        ])
      };

      const { getExportAdapter } = require('@/lib/export/registry');
      getExportAdapter.mockReturnValue(mockAdapter);

      const request = new NextRequest('http://localhost:3000/api/export/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpId: 'kp-123',
          format: 'xlsx'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('factory_order_test_2025-01-15.xlsx');

      const buffer = await response.arrayBuffer();
      expect(buffer).toBeDefined();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    it('должен возвращать ошибку 400 при невалидных данных', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpId: '', // Пустой ID
          format: 'xlsx'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('ID КП обязателен');
    });

    it('должен возвращать ошибку 400 при неподдерживаемом формате', async () => {
      const request = new NextRequest('http://localhost:3000/api/export/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpId: 'kp-123',
          format: 'pdf' // Неподдерживаемый формат
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('Неподдерживаемый формат');
    });

    it('должен возвращать ошибку 400 при несуществующем КП', async () => {
      const mockAdapter = {
        validateKP: jest.fn().mockResolvedValue({
          valid: false,
          error: {
            code: 'KP_NOT_FOUND',
            message: 'КП не найден или не принят',
            field: 'kpId',
            value: 'kp-nonexistent'
          }
        })
      };

      const { getExportAdapter } = require('@/lib/export/registry');
      getExportAdapter.mockReturnValue(mockAdapter);

      const request = new NextRequest('http://localhost:3000/api/export/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpId: 'kp-nonexistent',
          format: 'xlsx'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('КП не найден или не принят');
    });

    it('должен возвращать ошибку 500 при внутренней ошибке', async () => {
      const mockAdapter = {
        validateKP: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      };

      const { getExportAdapter } = require('@/lib/export/registry');
      getExportAdapter.mockReturnValue(mockAdapter);

      const request = new NextRequest('http://localhost:3000/api/export/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpId: 'kp-123',
          format: 'xlsx'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('Внутренняя ошибка сервера');
    });

    it('должен корректно обрабатывать пустую корзину КП', async () => {
      const mockAdapter = {
        validateKP: jest.fn().mockResolvedValue({ valid: true }),
        getKPData: jest.fn().mockResolvedValue({
          id: 'kp-empty',
          items: [], // Пустая корзина
          created_at: '2025-01-15T10:00:00Z',
          total: 0
        }),
        toExportRows: jest.fn().mockResolvedValue([]) // Пустой массив строк
      };

      const { getExportAdapter } = require('@/lib/export/registry');
      getExportAdapter.mockReturnValue(mockAdapter);

      const request = new NextRequest('http://localhost:3000/api/export/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpId: 'kp-empty',
          format: 'xlsx'
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('КП не содержит позиций для экспорта');
    });
  });

  describe('Request Validation', () => {
    it('должен валидировать обязательные поля', async () => {
      const testCases = [
        { body: {}, expectedError: 'kpId' },
        { body: { kpId: 'test' }, expectedError: 'format' },
        { body: { format: 'xlsx' }, expectedError: 'kpId' }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/export/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase.body)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        
        const errorData = await response.json();
        expect(errorData.error).toContain(testCase.expectedError);
      }
    });

    it('должен валидировать типы данных', async () => {
      const testCases = [
        { body: { kpId: 123, format: 'xlsx' }, expectedError: 'строкой' },
        { body: { kpId: 'test', format: 123 }, expectedError: 'строкой' }
      ];

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/export/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase.body)
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        
        const errorData = await response.json();
        expect(errorData.error).toContain(testCase.expectedError);
      }
    });
  });
});
