import { NextRequest, NextResponse } from "next/server";
import { mockDoorsData } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { selection } = body;

    if (!selection) {
      return NextResponse.json(
        { error: "Данные для расчета не предоставлены" },
        { status: 400 }
      );
    }

    // Ищем продукт в mock данных
    const product = mockDoorsData.catalog.find(p => 
      p.series === selection.model &&
      p.material === selection.finish &&
      p.color === selection.color &&
      p.width_mm === selection.width &&
      p.height_mm === selection.height
    );

    if (!product) {
      return NextResponse.json(
        { error: "Продукт не найден" },
        { status: 404 }
      );
    }

    // Рассчитываем цену
    let total = product.price_rrc;
    const breakdown = [
      { label: "Базовая цена", amount: product.price_rrc }
    ];

    // Добавляем комплект фурнитуры если выбран
    if (selection.hardware_kit?.id) {
      const kit = mockDoorsData.kits.find(k => k.id === selection.hardware_kit.id);
      if (kit) {
        total += kit.price_rrc || 0;
        breakdown.push({ 
          label: `Комплект: ${kit.name}`, 
          amount: kit.price_rrc || 0 
        });
      }
    }

    // Добавляем ручку если выбрана
    if (selection.handle?.id) {
      const handle = mockDoorsData.handles.find(h => h.id === selection.handle.id);
      if (handle) {
        total += handle.price_rrc || 0;
        breakdown.push({ 
          label: `Ручка: ${handle.name}`, 
          amount: handle.price_rrc || 0 
        });
      }
    }

    return NextResponse.json({
      ok: true,
      currency: "RUB",
      base: product.price_rrc,
      breakdown,
      total: Math.round(total),
      sku_1c: product.sku
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Ошибка расчета цены" },
      { status: 500 }
    );
  }
}
