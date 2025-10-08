import { NextRequest, NextResponse } from 'next/server';

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

    // Простые данные (в реальном проекте - из базы данных)
    const styles = {
      modern: { name: 'Современная', basePrice: 15000 },
      classic: { name: 'Классическая', basePrice: 18000 },
      neoclassic: { name: 'Неоклассика', basePrice: 17000 },
      hidden: { name: 'Скрытая', basePrice: 25000 },
    };

    const finishes = {
      paint: { name: 'Эмаль', multiplier: 1.0 },
      veneer: { name: 'Шпон', multiplier: 1.3 },
      glass: { name: 'Стекло', multiplier: 1.4 },
      nanotex: { name: 'Нанотекс', multiplier: 1.1 },
    };

    const selectedStyle = styles[style as keyof typeof styles];
    const selectedFinish = finishes[finish as keyof typeof finishes];

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
