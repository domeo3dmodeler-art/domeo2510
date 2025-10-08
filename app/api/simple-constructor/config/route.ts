import { NextRequest, NextResponse } from 'next/server';

// Простые данные для конфигуратора (в реальном проекте - из базы данных)
const doorConfigurations = {
  styles: [
    { id: 'modern', name: 'Современная', basePrice: 15000, image: '/door-images/modern.svg' },
    { id: 'classic', name: 'Классическая', basePrice: 18000, image: '/door-images/classic.svg' },
    { id: 'neoclassic', name: 'Неоклассика', basePrice: 17000, image: '/door-images/neoclassic.svg' },
    { id: 'hidden', name: 'Скрытая', basePrice: 25000, image: '/door-images/hidden.svg' },
  ],
  finishes: [
    { id: 'paint', name: 'Эмаль', multiplier: 1.0 },
    { id: 'veneer', name: 'Шпон', multiplier: 1.3 },
    { id: 'glass', name: 'Стекло', multiplier: 1.4 },
    { id: 'nanotex', name: 'Нанотекс', multiplier: 1.1 },
  ],
  sizes: {
    width: { min: 600, max: 1200, step: 50 },
    height: { min: 1800, max: 2400, step: 50 },
  }
};

// GET /api/simple-constructor/config - Получить конфигурацию
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: doorConfigurations
    });
  } catch (error) {
    console.error('Error fetching constructor config:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при получении конфигурации' },
      { status: 500 }
    );
  }
}

// POST /api/simple-constructor/calculate - Рассчитать цену
export async function POST(request: NextRequest) {
  try {
    const { style, finish, width, height } = await request.json();

    if (!style || !finish || !width || !height) {
      return NextResponse.json(
        { success: false, message: 'Не все параметры переданы' },
        { status: 400 }
      );
    }

    const selectedStyle = doorConfigurations.styles.find(s => s.id === style);
    const selectedFinish = doorConfigurations.finishes.find(f => f.id === finish);

    if (!selectedStyle || !selectedFinish) {
      return NextResponse.json(
        { success: false, message: 'Неверные параметры' },
        { status: 400 }
      );
    }

    // Расчет цены
    const basePrice = selectedStyle.basePrice;
    const finishMultiplier = selectedFinish.multiplier;
    const areaMultiplier = (width * height) / (800 * 2000); // Базовая площадь 800x2000
    const totalPrice = Math.round(basePrice * finishMultiplier * areaMultiplier);

    return NextResponse.json({
      success: true,
      data: {
        price: totalPrice,
        breakdown: {
          basePrice,
          finishMultiplier,
          areaMultiplier,
          style: selectedStyle.name,
          finish: selectedFinish.name,
          dimensions: `${width}×${height} мм`
        }
      }
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    return NextResponse.json(
      { success: false, message: 'Ошибка при расчете цены' },
      { status: 500 }
    );
  }
}
