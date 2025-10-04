import { NextRequest, NextResponse } from "next/server";
import { mockDoorsData } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku } = body;

    if (!sku) {
      return NextResponse.json(
        { error: "SKU не предоставлен" },
        { status: 400 }
      );
    }

    // Ищем продукт по SKU в mock данных
    const product = mockDoorsData.catalog.find(p => p.sku === sku);

    if (!product) {
      return NextResponse.json({
        ok: false,
        error: "Продукт не найден"
      });
    }

    // Возвращаем данные для предзаполнения формы
    const selection = {
      style: product.series,
      model: product.series,
      finish: product.material,
      color: product.color,
      type: "Распашная", // Демо значение
      width: product.width_mm,
      height: product.height_mm
    };

    return NextResponse.json({
      ok: true,
      selection
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Ошибка поиска продукта" },
      { status: 500 }
    );
  }
}