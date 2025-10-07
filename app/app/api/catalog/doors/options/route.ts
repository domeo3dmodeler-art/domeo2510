import { NextRequest, NextResponse } from "next/server";
import { mockDoorsData } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = Object.fromEntries(searchParams.entries()) as Record<string, string>;

  const style  = q.style  ?? null;
  const model  = q.model  ?? null;
  const finish = q.finish ?? null;
  const color  = q.color  ?? null;
  const type   = q.type   ?? null;
  const width  = q.width  ? String(q.width)  : null;
  const height = q.height ? String(q.height) : null;

  // Use mock data instead of database
  const mockOptions = {
    style: ["Современная", "Классика", "Неоклассика", "Скрытая"],
    model: ["Современная", "Классика", "Неоклассика", "Скрытая"],
    finish: ["Белый", "Дуб", "Орех", "Черный"],
    color: ["Белый", "Дуб", "Орех", "Черный"],
    type: ["handle", "lock", "hinge"],
    width: [600, 700, 800, 900],
    height: [1900, 2000, 2100, 2200],
    kits: [
      { id: 1, name: "Комплект золотой", price_rrc: 5000, model: "Современная" },
      { id: 2, name: "Комплект серебряный", price_rrc: 4500, model: "Классика" },
    ],
    handles: [
      { id: 1, name: "Ручка золотая", price_opt: 1500, price_group_multiplier: 1.0, supplier_name: "Поставщик 1", supplier_sku: "HANDLE-001" },
      { id: 2, name: "Ручка серебряная", price_opt: 1200, price_group_multiplier: 1.0, supplier_name: "Поставщик 1", supplier_sku: "HANDLE-002" },
    ],
  };

  return NextResponse.json({
    ok: true,
    domain: mockOptions
  });
}
