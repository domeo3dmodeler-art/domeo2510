import { NextRequest, NextResponse } from 'next/server';
import { dbOptimizationService } from '../../../../../lib/services/database-optimization.service';

// GET /api/admin/database/optimization - Получение статистики и рекомендаций
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = await dbOptimizationService.getPerformanceStats();
        return NextResponse.json({
          success: true,
          stats
        });

      case 'recommendations':
        const recommendations = await dbOptimizationService.getOptimizationRecommendations();
        return NextResponse.json({
          success: true,
          recommendations
        });

      default:
        return NextResponse.json({
          success: true,
          message: 'API для оптимизации базы данных',
          endpoints: [
            'GET /api/admin/database/optimization?action=stats',
            'GET /api/admin/database/optimization?action=recommendations',
            'POST /api/admin/database/optimization?action=optimize',
            'POST /api/admin/database/optimization?action=update-stats',
            'POST /api/admin/database/optimization?action=normalize-properties',
            'POST /api/admin/database/optimization?action=cleanup-cache'
          ]
        });
    }
  } catch (error) {
    console.error('Ошибка при получении данных оптимизации:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении данных оптимизации' },
      { status: 500 }
    );
  }
}

// POST /api/admin/database/optimization - Выполнение операций оптимизации
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { error: 'Не указано действие' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'optimize':
        console.log('🚀 Запуск полной оптимизации БД...');
        await dbOptimizationService.performFullOptimization();
        return NextResponse.json({
          success: true,
          message: 'Полная оптимизация базы данных завершена'
        });

      case 'update-stats':
        console.log('📊 Обновление статистики товаров...');
        await dbOptimizationService.updateProductStatsCache();
        return NextResponse.json({
          success: true,
          message: 'Статистика товаров обновлена'
        });

      case 'normalize-properties':
        console.log('🔄 Нормализация свойств товаров...');
        await dbOptimizationService.normalizeProductProperties();
        return NextResponse.json({
          success: true,
          message: 'Свойства товаров нормализованы'
        });

      case 'cleanup-cache':
        console.log('🧹 Очистка кэша...');
        await dbOptimizationService.cleanupExpiredCache();
        return NextResponse.json({
          success: true,
          message: 'Кэш очищен'
        });

      case 'optimize-sqlite':
        console.log('🔧 Оптимизация настроек SQLite...');
        await dbOptimizationService.optimizeSQLiteSettings();
        return NextResponse.json({
          success: true,
          message: 'Настройки SQLite оптимизированы'
        });

      case 'create-virtual-columns':
        console.log('🔧 Создание виртуальных колонок...');
        await dbOptimizationService.createVirtualColumns();
        return NextResponse.json({
          success: true,
          message: 'Виртуальные колонки созданы'
        });

      case 'optimize-indexes':
        console.log('🔧 Оптимизация индексов...');
        await dbOptimizationService.optimizeIndexes();
        return NextResponse.json({
          success: true,
          message: 'Индексы оптимизированы'
        });

      default:
        return NextResponse.json(
          { error: `Неизвестное действие: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`Ошибка при выполнении действия ${action}:`, error);
    return NextResponse.json(
      { 
        error: 'Ошибка при выполнении операции оптимизации',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}
