import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 💾 Сохранить конфигурацию калькулятора
 */
export async function POST(req: NextRequest) {
  try {
    const config = await req.json();
    
    if (!config.name) {
      return NextResponse.json(
        { error: 'Название калькулятора обязательно' },
        { status: 400 }
      );
    }

    // Создаем новую конфигурацию калькулятора
    const calculatorConfig = await prisma.calculatorConfig.create({
      data: {
        name: config.name,
        description: config.description || '',
        config: JSON.stringify(config),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      id: calculatorConfig.id,
      message: 'Калькулятор сохранен успешно'
    });

  } catch (error) {
    console.error('Ошибка сохранения калькулятора:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении калькулятора' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 📋 Получить список калькуляторов
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      // Получить конкретный калькулятор
      const calculator = await prisma.calculatorConfig.findUnique({
        where: { id }
      });

      if (!calculator) {
        return NextResponse.json(
          { error: 'Калькулятор не найден' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        calculator: {
          id: calculator.id,
          name: calculator.name,
          description: calculator.description,
          config: JSON.parse(calculator.config),
          isActive: calculator.is_active,
          createdAt: calculator.created_at,
          updatedAt: calculator.updated_at
        }
      });
    } else {
      // Получить все калькуляторы
      const calculators = await prisma.calculatorConfig.findMany({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true
        }
      });

      return NextResponse.json({
        success: true,
        calculators
      });
    }

  } catch (error) {
    console.error('Ошибка получения калькуляторов:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении калькуляторов' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * ✏️ Обновить калькулятор
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, ...config } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID калькулятора обязателен' },
        { status: 400 }
      );
    }

    const updatedCalculator = await prisma.calculatorConfig.update({
      where: { id },
      data: {
        name: config.name,
        description: config.description || '',
        config: JSON.stringify(config),
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Калькулятор обновлен успешно'
    });

  } catch (error) {
    console.error('Ошибка обновления калькулятора:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении калькулятора' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 🗑️ Удалить калькулятор
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID калькулятора обязателен' },
        { status: 400 }
      );
    }

    // Мягкое удаление
    await prisma.calculatorConfig.update({
      where: { id },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Калькулятор удален успешно'
    });

  } catch (error) {
    console.error('Ошибка удаления калькулятора:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении калькулятора' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
