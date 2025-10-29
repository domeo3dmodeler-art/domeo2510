'use client';

// Гарантируем базовый API_URL в браузере
if (typeof window !== "undefined") {
  (window as any).__API_URL__ = (window as any).__API_URL__ ?? "/api";
}

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { PhotoGallery } from "../../components/PhotoGallery";
import { ModernPhotoGallery } from "../../components/ModernPhotoGallery";
import { priceRecalculationService } from "@/lib/cart/price-recalculation-service";
import { getCurrentUser } from "@/lib/auth/token-interceptor";
import { useAuth } from "@/lib/auth/AuthContext";
import GlobalHeader from "../../components/layout/GlobalHeader";
import NotificationBell from "../../components/ui/NotificationBell";
import HandleSelectionModal from "../../components/HandleSelectionModal";

// ===================== Типы =====================
type BasicState = {
  // Уровень 1: Основные характеристики
  style?: string;        // Стиль двери (влияет на модели)
  model?: string;        // Модель двери (влияет на покрытия)
  
  // Уровень 2: Материалы и отделка
  finish?: string;       // Покрытие (влияет на цвета)
  color?: string;        // Цвет (влияет на размеры)
  
  // Уровень 3: Размеры
  width?: number;        // Ширина (влияет на кромку)
  height?: number;       // Высота (влияет на кромку)
  
  // Уровень 4: Дополнительные элементы
  // edge?: string;         // Кромка (временно отключена)
  // edge_note?: string;    // Примечание к кромке
  // edge_cost?: string;    // Стоимость надбавки за кромку
  
  // Уровень 5: Фурнитура
  hardware_kit?: { id: string };  // Комплект фурнитуры
  handle?: { id: string };        // Ручка
  
  // Технические параметры (не влияют на другие)
  type?: string;         // Тип конструкции (обычно всегда "Распашная")
};

type ProductLike = {
  sku_1c?: string | number | null;
  model?: string | null;
};

type CartItem = {
  id: string;
  style?: string;
  model?: string;
  finish?: string;
  type?: string;
  width?: number;
  height?: number;
  color?: string;
  qty: number;
  unitPrice: number;
  handleId?: string;
  handleName?: string; // Добавляем название ручки
  sku_1c?: string | number | null;
  // edge?: string;
  // edge_note?: string;
  hardwareKitId?: string;
  hardwareKitName?: string; // Добавляем название комплекта фурнитуры
  baseAtAdd: number;
};

type DomainKits = { id: string; name: string; group?: number; price_rrc?: number }[];
type DomainHandles = {
  id: string;
  name: string;
  supplier_name?: string;
  supplier_sku?: string;
  price_opt?: number;
  price_rrc?: number;
  price_group_multiplier?: number;
}[];

type HardwareKit = {
  id: string;
  name: string;
  description: string;
  price: number;
  priceGroup: string;
  isBasic: boolean;
};

type Handle = {
  id: string;
  name: string;
  group: string;
  price: number;
  isBasic: boolean;
  showroom: boolean;
  supplier?: string;
  article?: string;
  factoryName?: string;
  photos?: string[];
};

type Domain =
  | {
      style?: string[];
      model?: string[];
      finish?: string[];
      color?: string[];
      type?: string[];
      width?: number[];
      height?: number[];
      // edge?: string[];
      kits?: DomainKits;
      handles?: DomainHandles;
    }
  | null;

// ===================== Утилиты =====================
const fmtInt = (n: number): string =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const fmt2 = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);

const uid = (): string => Math.random().toString(36).slice(2, 9);

const hasBasic = (s: Partial<BasicState>): boolean =>
  !!(s.style && s.model && s.finish && s.color && s.width && s.height);

const API: string | null =
  typeof window !== "undefined" ? ((window as any).__API_URL__ as string) : null;

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Функция для сброса зависимых параметров по иерархии
const resetDependentParams = (currentSel: Partial<BasicState>, changedParam: keyof BasicState): Partial<BasicState> => {
  const newSel = { ...currentSel };
  
  switch (changedParam) {
    case 'style':
      // При смене стиля сбрасываем все зависимые параметры
      newSel.model = undefined;
      newSel.finish = undefined;
      newSel.color = undefined;
      newSel.width = undefined;
      newSel.height = undefined;
      // newSel.edge = undefined;
      // newSel.edge_note = undefined;
      newSel.hardware_kit = undefined;
      newSel.handle = undefined;
      break;
      
    case 'model':
      // При смене модели сбрасываем покрытие и все зависимые
      newSel.finish = undefined;
      newSel.color = undefined;
      newSel.width = undefined;
      newSel.height = undefined;
      // newSel.edge = undefined;
      // newSel.edge_note = undefined;
      newSel.hardware_kit = undefined;
      newSel.handle = undefined;
      break;
      
    case 'finish':
      // При смене покрытия сбрасываем цвет и все зависимые
      newSel.color = undefined;
      newSel.width = undefined;
      newSel.height = undefined;
      // newSel.edge = undefined;
      // newSel.edge_note = undefined;
      newSel.hardware_kit = undefined;
      newSel.handle = undefined;
      break;
      
    case 'color':
      // При смене цвета сбрасываем размеры и все зависимые
      newSel.width = undefined;
      newSel.height = undefined;
      // newSel.edge = undefined;
      // newSel.edge_note = undefined;
      newSel.hardware_kit = undefined;
      newSel.handle = undefined;
      break;
      
    case 'width':
    case 'height':
      // При смене размеров НЕ сбрасываем фурнитуру - она не зависит от размеров
      // newSel.edge = undefined;
      // newSel.edge_note = undefined;
      // newSel.hardware_kit = undefined;
      // newSel.handle = undefined;
      break;
      
    // case 'edge':
    //   // При смене кромки сбрасываем фурнитуру и стоимость
    //   newSel.edge_note = undefined;
    //   newSel.edge_cost = undefined;
    //   newSel.hardware_kit = undefined;
    //   newSel.handle = undefined;
    //   break;
      
    // type не влияет на другие параметры
    // hardware_kit и handle не влияют на другие параметры
  }
  
  return newSel;
};

// Функция для форматирования названия модели под карточкой (убираем префикс DomeoDoors)
const formatModelNameForCard = (modelName: string): string => {
  return modelName
    .replace(/^DomeoDoors\s*/i, '') // Убираем префикс DomeoDoors с любыми пробелами после него
    .replace(/^Domeodoors\s*/i, '') // Убираем префикс Domeodoors с любыми пробелами после него
    .replace(/_/g, ' ') // Заменяем подчеркивания на пробелы
    .trim(); // Убираем лишние пробелы
};

// Функция для форматирования названия модели над большим фото (убираем префикс DomeoDoors)
const formatModelNameForPreview = (modelName: string): string => {
  return modelName
    .replace(/^DomeoDoors\s*/i, '') // Убираем префикс DomeoDoors с любыми пробелами после него
    .replace(/^Domeodoors\s*/i, '') // Убираем префикс Domeodoors с любыми пробелами после него
    .replace(/_/g, ' ') // Заменяем подчеркивания на пробелы
    .trim(); // Убираем лишние пробелы
};

const imageCandidates = (obj: ProductLike): string[] => {
  const sku = obj?.sku_1c != null ? String(obj.sku_1c).trim() : "";
  const enc = obj?.model ? encodeURIComponent(obj.model) : "";
  const slug = obj?.model ? slugify(obj.model) : "";
  const stems = [sku, enc, slug].filter(Boolean) as string[];
  const out: string[] = [];
  for (const stem of stems) {
    out.push(`/assets/doors/${stem}.jpg`, `/assets/doors/${stem}.png`);
  }
  return out;
};

// ===================== MOCK (для живости без бэка) =====================
const styleTiles = [
  { key: "Скрытая", bg: "linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)" },
  { key: "Современная", bg: "linear-gradient(135deg,#e5f0ff 0%,#e0e7ff 100%)" },
  { key: "Неоклассика", bg: "linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)" },
  { key: "Классика", bg: "linear-gradient(135deg,#fef9c3 0%,#fde68a 100%)" },
];

const mockData = {
  products: [
    {
      model: "PG Base 1",
      modelPhoto: "/media/doors/pg-base-1.jpg",
      style: "Современная",
      finish: "Нанотекс",
      color: "Белый",
      type: "Распашная",
      width: 800,
      height: 2000,
      rrc_price: 21280,
      sku_1c: "SKU-PG-800-2000-BEL",
      supplier: "Supplier1",
      collection: "Collection A",
      supplier_item_name: "PG Base 1",
      supplier_color_finish: "Белый/Нанотекс",
      price_opt: 13832,
    },
    {
      model: "PO Base 1/1",
      modelPhoto: "/media/doors/po-base-1-1.jpg",
      style: "Современная",
      finish: "Нанотекс",
      color: "Белый",
      type: "Распашная",
      width: 800,
      height: 2000,
      rrc_price: 22900,
      sku_1c: "SKU-PO11-800-2000-BEL",
      supplier: "Supplier1",
      collection: "Collection A",
      supplier_item_name: "PO Base 1/1",
      supplier_color_finish: "Белый/Нанотекс",
      price_opt: 14885,
    },
    {
      model: "PO Base 1/2",
      modelPhoto: "/media/doors/po-base-1-2.jpg",
      style: "Современная",
      finish: "Нанотекс",
      color: "Белый",
      type: "Распашная",
      width: 900,
      height: 2000,
      rrc_price: 23900,
      sku_1c: "SKU-PO12-900-2000-BEL",
      supplier: "Supplier1",
      collection: "Collection A",
      supplier_item_name: "PO Base 1/2",
      supplier_color_finish: "Белый/Нанотекс",
      price_opt: 15535,
    },
    {
      model: "Neo-1",
      modelPhoto: "/media/doors/neo1.jpg",
      style: "Неоклассика",
      finish: "Эмаль",
      color: "Слоновая кость",
      type: "Распашная",
      width: 800,
      height: 2000,
      rrc_price: 27900,
      sku_1c: "SKU-NEO1-800-2000-IV",
      supplier: "Supplier2",
      collection: "Neo",
      supplier_item_name: "Neo-1",
      supplier_color_finish: "Слоновая кость/Эмаль",
      price_opt: 18135,
    },
  ],
  kits: [
    { id: "KIT_STD", name: "Базовый комплект", group: 1, price_rrc: 5000 },
    { id: "KIT_SOFT", name: "SoftClose", group: 2, price_rrc: 2400 },
  ],
  handles: [
    {
      id: "HNDL_PRO",
      name: "Pro",
      supplier_name: "HandleCo",
      supplier_sku: "H-PRO",
      price_opt: 900,
      price_rrc: 1200,
      price_group_multiplier: 1.15,
    },
    {
      id: "HNDL_SIL",
      name: "Silver",
      supplier_name: "HandleCo",
      supplier_sku: "H-SIL",
      price_opt: 1100,
      price_rrc: 1400,
      price_group_multiplier: 1.15,
    },
  ],
};

const mockApi = {
  async getOptions(query: URLSearchParams): Promise<{ ok: true; domain: any }> {
    const q = Object.fromEntries(query.entries());
    const filtered = mockData.products.filter((p) =>
      Object.entries(q).every(
        ([k, v]) => !v || String((p as any)[k]) === String(v)
      )
    );
    const order = [
      "style",
      "model",
      "finish",
      "color",
      "type",
      "width",
      "height",
    ] as const;
    const domain: any = {};
    for (const key of order) {
      const upstream = order.slice(0, order.indexOf(key));
      const subset = mockData.products.filter((p) =>
        upstream.every(
          (u) => !(q as any)[u] || String((p as any)[u]) === String((q as any)[u])
        )
      );
      domain[key] = Array.from(
        new Set(
          subset
            .map((p) => (p as any)[key])
            .filter((v: any) => v !== undefined && v !== "")
        )
      ).sort((a: any, b: any) => (a > b ? 1 : a < b ? -1 : 0));
    }
    domain.kits = mockData.kits;
    domain.handles = mockData.handles;
    for (const k of [
      "model",
      "finish",
      "color",
      "type",
      "width",
      "height",
    ] as const) {
      if ((q as any).style || (q as any).model)
        domain[k] = Array.from(
          new Set(filtered.map((p) => (p as any)[k]).filter(Boolean))
        ).sort((a: any, b: any) => (a > b ? 1 : a < b ? -1 : 0));
    }
    domain.style = Array.from(
      new Set(((q as any).style ? filtered : mockData.products).map((p) => p.style))
    ).sort();
    return { ok: true, domain };
  },

  async listModelsByStyle(style?: string): Promise<{ model: string; style: string }[]> {
    const rows = mockData.products.filter((p) => !style || p.style === style);
    const seen = new Set<string>();
    const models = rows.filter((p) => {
      if (seen.has(p.model)) return false;
      seen.add(p.model);
      return true;
    });
    return models.map((p) => ({ model: p.model, style: p.style }));
  },

  async price(selection: any): Promise<any> {
    // Используем реальный API для расчета цены
    const response = await fetch('/api/price/doors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selection)
    });
    
    if (!response.ok) {
      throw new Error('Price calculation failed');
    }
    
    const priceData = await response.json();
    
    // Пока что возвращаем только базовую цену двери
    // Цена комплекта и ручки будет добавлена в компоненте
    return {
      ok: true,
      currency: "RUB",
      base: priceData.total,
      breakdown: priceData.breakdown || [],
      total: priceData.total,
      sku_1c: priceData.sku_1c,
    };
  },

  async kp(cart: { items: CartItem[] }): Promise<string> {
    const rows: string[] = [];
    let n = 1;
    for (const it of cart.items) {
      const parts: string[] = [];
      if (it.width && it.height) parts.push(`${it.width}×${it.height}`);
      if (it.color) parts.push(it.color);
      // if (it.edge === "да") parts.push(`Кромка${it.edge_note ? `: ${it.edge_note}` : ""}`);
      
      // Находим правильное название модели
      const modelName = it.model ? formatModelNameForCard(it.model) : 'Неизвестная модель';
      
      const nameCore = `${modelName}${parts.length ? ` (${parts.join(", ")})` : ""}`;
      const sum = it.unitPrice * it.qty;
      rows.push(
        `<tr><td>${n}</td><td>${nameCore}</td><td class="num">${fmtInt(
          it.unitPrice
        )}</td><td class="num">${it.qty}</td><td class="num">${fmtInt(sum)}</td></tr>`
      );
      if (it.handleId) {
        // Временно используем mock данные для экспорта
        const h = mockData.handles.find((h) => h.id === it.handleId);
        if (h) {
          const handleRetail = Math.round(h.price_opt! * h.price_group_multiplier!);
          const hSum = handleRetail * it.qty;
          rows.push(
            `<tr class="sub"><td></td><td>Ручка: ${h.name} — ${fmtInt(
              handleRetail
            )} × ${it.qty} = ${fmtInt(hSum)}</td><td class="num">${fmtInt(
              handleRetail
            )}</td><td class="num">${it.qty}</td><td class="num">${fmtInt(hSum)}</td></tr>`
          );
        }
      }
      n++;
    }
    return `<!doctype html><html><head><meta charset="utf-8"/><style>
      body{font-family:ui-sans-serif,system-ui}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#f6f6f6;text-align:left}
      td.num{text-align:right}
      tr.sub td{color:#444;font-style:italic;background:#fafafa}
    </style></head><body>
      <h1>Коммерческое предложение — Doors</h1>
      <table><thead><tr><th>№</th><th>Наименование</th><th>Цена РРЦ, руб</th><th>Количество</th><th>Сумма, руб</th></tr></thead>
      <tbody>${rows.join("")}</tbody></table></body></html>`;
  },

  async invoice(cart: { items: CartItem[] }): Promise<string> {
    const total = cart.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const rows = cart.items
      .flatMap((i, idx) => {
        // Находим правильное название модели
        const modelName = i.model ? formatModelNameForCard(i.model) : 'Неизвестная модель';
        
        const baseRow = `<tr>
        <td class="num">${idx + 1}</td>
        <td>${i.sku_1c || "—"}</td>
        <td>${modelName} (${i.width}×${i.height}${i.color ? `, ${i.color}` : ""})</td>
        <td class="num">${fmtInt(i.unitPrice)}</td>
        <td class="num">${i.qty}</td>
        <td class="num">${fmtInt(i.unitPrice * i.qty)}</td>
      </tr>`;
        const handle = i.handleId
          ? mockData.handles.find((h) => h.id === i.handleId)
          : undefined;
        const handleRetail = handle ? Math.round(handle.price_opt! * handle.price_group_multiplier!) : 0;
        const handleRow = handle
          ? `<tr class="sub">
        <td></td>
        <td>${handle.supplier_sku || "—"}</td>
        <td>Ручка: ${handle.name}</td>
        <td class="num">${fmtInt(handleRetail)}</td>
        <td class="num">${i.qty}</td>
        <td class="num">${fmtInt(handleRetail * i.qty)}</td>
      </tr>`
          : "";
        return [baseRow, handleRow];
      })
      .join("");

    return `<!doctype html><html><head><meta charset="utf-8"/><style>
      body{font-family:ui-sans-serif,system-ui}
      .row{display:flex;justify-content:space-between}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#f6f6f6;text-align:left}
      td.num{text-align:right}
      tr.sub td{color:#444;font-style:italic;background:#fafafa}
    </style></head><body>
      <h1>Счет на оплату</h1>
      <div class="row"><div>Покупатель: —</div><div>ИНН: —</div></div>
      <table><thead><tr><th>№</th><th>Артикул</th><th>Наименование</th><th>Цена, руб</th><th>Кол-во</th><th>Сумма, руб</th></tr></thead><tbody>
        ${rows}
      </tbody></table>
      <h3>Итого: ${fmtInt(total)} ₽</h3>
    </body></html>`;
  },

  async factory(cart: { items: CartItem[] }): Promise<string> {
    const header = [
      "N",
      "Supplier",
      "Collection",
      "SupplierItemName",
      "SupplierColorFinish",
      "Width",
      "Height",
      "HardwareKit",
      "OptPrice",
      "RetailPrice",
      "Qty",
      "SumOpt",
      "SumRetail",
    ];
    let n = 0;
    const lines = [header.join(",")];

    for (const i of cart.items) {
      n++;
      const prod = mockData.products.find(
        (p) =>
          p.model === i.model &&
          p.width === i.width &&
          p.height === i.height &&
          p.color === i.color
      );
      const kit = i.hardwareKitId ? mockData.kits.find((k) => k.id === i.hardwareKitId) : undefined;
      const opt =
        prod && (prod as any).price_opt
          ? (prod as any).price_opt
          : Math.round((prod && prod.rrc_price ? prod.rrc_price : 0) * 0.65);
      const retail = (prod && prod.rrc_price ? prod.rrc_price : 0) + (kit ? kit.price_rrc! : 0);
      const sumOpt = opt * i.qty;
      const sumRetail = retail * i.qty;

      // Находим правильное название модели
      const modelName = i.model ? formatModelNameForCard(i.model) : 'Неизвестная модель';
      
      lines.push(
        [
          String(n),
          (prod && (prod as any).supplier) || "",
          (prod && (prod as any).collection) || "",
          (prod && ((prod as any).supplier_item_name || modelName)) || "",
          (prod && (prod as any).supplier_color_finish) || "",
          String(i.width || ""),
          String(i.height || ""),
          kit ? `${kit.name} (гр. ${kit.group})` : "",
          fmt2(opt),
          fmt2(retail),
          String(i.qty),
          fmt2(sumOpt),
          fmt2(sumRetail),
        ].join(",")
      );

      if (i.handleId) {
        const h = mockData.handles.find((h) => h.id === i.handleId);
        if (h) {
          const hSumOpt = h.price_opt! * i.qty;
          const hRetail = h.price_opt! * h.price_group_multiplier!;
          const hSumRetail = hRetail * i.qty;
          lines.push(
            [
              "",
              h.name || "",
              "",
              `Ручка: ${h.name}`,
              h.supplier_sku || "",
              "",
              "",
              "",
              fmt2(h.price_opt!),
              fmt2(hRetail),
              String(i.qty),
              fmt2(hSumOpt),
              fmt2(hSumRetail),
            ].join(",")
          );
        }
      }
    }
    return lines.join("\n");
  },
};

const realApi = {
  async getOptions(query: URLSearchParams): Promise<any> {
    const r = await fetch(`${API}/catalog/doors/options?${query.toString()}`);
    if (!r.ok) throw new Error(`options HTTP ${r.status}`);
    return r.json();
  },
  async listModelsByStyle(style?: string): Promise<any> {
    const r = await fetch(
      `${API}/catalog/doors/models?style=${encodeURIComponent(style || "")}`
    );
    if (!r.ok) throw new Error(`models HTTP ${r.status}`);
    return r.json();
  },
  async price(selection: any): Promise<any> {
    const r = await fetch(`${API}/price/doors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection }),
    });
    if (!r.ok) throw new Error(`price HTTP ${r.status}`);
    return r.json();
  },
  async kp(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetch(`${API}/cart/export/doors/kp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });
    if (!r.ok) throw new Error(`kp HTTP ${r.status}`);
    return r.text();
  },
  async invoice(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetch(`${API}/cart/export/doors/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });
    if (!r.ok) throw new Error(`invoice HTTP ${r.status}`);
    return r.text();
  },
  async factory(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetch(`${API}/cart/export/doors/factory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });
    if (!r.ok) throw new Error(`factory HTTP ${r.status}`);
    return r.text();
  },

  // AUTH (Bearer) — __API_URL__ уже '/api', без лишнего /api
  async register(email: string, password: string): Promise<{ ok: boolean; status: number; text: string }> {
    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return { ok: r.ok, status: r.status, text: await r.text() };
  },
  async login(
    email: string,
    password: string
  ): Promise<{ ok: boolean; status: number; text: string; token: string }> {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const text = await r.text();
    let token = "";
    try {
      const j = JSON.parse(text);
      token = j.token || "";
    } catch {}
    return { ok: r.ok, status: r.status, text, token };
  },
  async importPrice(
    token: string,
    category: string,
    file: File,
    mappingJsonStr?: string
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const fd = new FormData();
    fd.append("file", file);
    if (mappingJsonStr) fd.append("mapping", mappingJsonStr);
    const r = await fetch(`${API}/admin/import/${category}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    return { ok: r.ok, status: r.status, text: await r.text() };
  },
  async uploadMedia(
    token: string,
    model: string,
    files: FileList | File[]
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const fd = new FormData();
    if (model) fd.append("model", model);
    const list: File[] = Array.isArray(files) ? (files as File[]) : Array.from(files as FileList);
    for (const f of list) fd.append("file", f);
    const r = await fetch(`${API}/admin/media/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: fd,
    });
    return { ok: r.ok, status: r.status, text: await r.text() };
  },
};

const api = mockApi; // Временно используем mockApi для отладки

// --- helper: resolve selection by SKU (prefill calculator) ---
async function resolveSelectionBySku(sku: string) {
  const r = await fetch("/api/catalog/doors/sku-to-selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku }),
  });
  if (!r.ok) throw new Error(`resolve ${r.status}`);
  return r.json() as Promise<{ ok: boolean; selection?: any }>;
}

// ===================== Страница Doors =====================
export default function DoorsPage() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<"config" | "admin">("config");

  // Состояние конфигуратора
  const [sel, setSel] = useState<Partial<BasicState>>({});
  const [domain, setDomain] = useState<Domain>(null);
  const [models, setModels] = useState<{ model: string; modelKey?: string; style: string; photo?: string | null; photos?: { cover: string | null; gallery: string[] }; hasGallery?: boolean }[]>([]);
  const [price, setPrice] = useState<any>(null);
  const [hardwareKits, setHardwareKits] = useState<HardwareKit[]>([]);
  const [handles, setHandles] = useState<Record<string, Handle[]>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [hideSidePanels, setHideSidePanels] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showHandleInfo, setShowHandleInfo] = useState(false);
  
  // Состояние для редактирования корзины
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});
  const [cartChanges, setCartChanges] = useState<Record<string, Partial<CartItem>>>({});
  const [cartHistory, setCartHistory] = useState<Array<{timestamp: Date, changes: Record<string, any>, totalDelta: number}>>([]);
  const [availableParams, setAvailableParams] = useState<any>(null);
  const [showCartManager, setShowCartManager] = useState(false);
  const [cartManagerBasePrices, setCartManagerBasePrices] = useState<Record<string, number>>({});
  const [showClientManager, setShowClientManager] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('guest');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [clientSearchInput, setClientSearchInput] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    address: '',
    objectId: ''
  });

  // Получаем роль пользователя
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserRole(user.role || 'complectator');
    } else {
      setUserRole('guest'); // Неавторизованный пользователь
    }
  }, [isAuthenticated, user]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setClientSearch(clientSearchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [clientSearchInput]);

  const formatPhone = (raw?: string) => {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    // Expect 11 digits for Russia starting with 7 or 8
    const d = digits.length === 11 ? digits.slice(-10) : digits.slice(-10);
    if (d.length < 10) return raw;
    return `+7 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,8)}-${d.slice(8,10)}`;
  };

  // Сохранение корзины в localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('domeo-cart', JSON.stringify(cart));
      localStorage.setItem('domeo-original-prices', JSON.stringify(originalPrices));
    }
  }, [cart, originalPrices]);

  // Загрузка корзины из localStorage при инициализации
  useEffect(() => {
    const savedCart = localStorage.getItem('domeo-cart');
    const savedPrices = localStorage.getItem('domeo-original-prices');
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
    
    if (savedPrices) {
      try {
        const parsedPrices = JSON.parse(savedPrices);
        setOriginalPrices(parsedPrices);
      } catch (error) {
        console.error('Error loading original prices from localStorage:', error);
      }
    }
  }, []);

  // Загрузка клиентов
  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else {
        console.error('Failed to fetch clients');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setClientsLoading(false);
    }
  };

  // Загружаем клиентов при открытии менеджера
  useEffect(() => {
    if (showClientManager) {
      fetchClients();
    }
  }, [showClientManager]);

  // Создание нового клиента
  const createClient = async (clientData: any) => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData)
      });

      if (response.ok) {
        const data = await response.json();
        await fetchClients(); // Обновляем список
        return data.client;
      } else {
        throw new Error('Failed to create client');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  };

  const [kpHtml, setKpHtml] = useState<string>("");
  
  // Состояние для интерактивной фишки
  const [isModelSelected, setIsModelSelected] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemDomains, setItemDomains] = useState<Record<string, Domain>>({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Клиентское кэширование для моделей с фото
  // Улучшенное кэширование моделей
  const [modelsCache, setModelsCache] = useState<Map<string, { data: any, timestamp: number }>>(new Map());
  const CACHE_TTL = 10 * 60 * 1000; // 10 минут кэш на клиенте
  
  // Состояние сворачивания блока стилей
  const [isStyleCollapsed, setIsStyleCollapsed] = useState(false);
  // Состояние сворачивания блока моделей
  const [isModelCollapsed, setIsModelCollapsed] = useState(false);
  
  // Состояние для стоимости кромки (временно отключено)
  // const [edgeCostData, setEdgeCostData] = useState<{
  //   hasCost: boolean;
  //   costValues: string[];
  //   sampleProduct: any;
  //   hasNoEdgeWithoutCost: number;
  //   hasNoEdgeWithCost: number;
  //   hasSpecificEdgeProducts: number;
  //   isEdgeUnavailable: boolean;
  // } | null>(null);

  // Обработка выбора модели
  const handleModelSelect = () => {
    if (sel.model) {
      setIsModelSelected(true);
      setIsModelCollapsed(true); // Сворачиваем блок моделей
    }
  };

  // Обработка сброса выбора
  const handleResetSelection = () => {
    setIsModelSelected(false);
    setIsModelCollapsed(false); // Разворачиваем блок моделей при сбросе
    setIsLoadingModels(false); // Сбрасываем состояние загрузки
    setSel((v) => {
      const newSel = resetDependentParams(v, 'style');
      newSel.style = undefined;
      return newSel;
    });
  };

  const selectedModelCard = useMemo(
    () => {
      console.log('🔍 selectedModelCard debug:', { 
        selModel: sel.model, 
        modelsCount: models?.length,
        modelsSample: models?.slice(0, 3).map(m => ({ model: m.model, modelKey: m.modelKey, photo: m.photo }))
      });
      
      const found = Array.isArray(models) ? models.find((m) => m.model === sel.model) || null : null;
      console.log('🔍 selectedModelCard result:', { 
        selModel: sel.model, 
        modelsCount: models?.length, 
        found: !!found,
        foundModel: found?.model,
        foundModelKey: found?.modelKey,
        foundPhoto: found?.photo,
        foundPhotos: found?.photos
      });
      
      return found;
      
      // Дополнительное логирование для отладки
      if (found) {
        console.log('🔍 Детали найденной модели:', {
          model: found.model,
          modelKey: found.modelKey,
          photo: found.photo,
          photos: found.photos,
          hasGallery: found.hasGallery,
          style: found.style
        });
      }
      
      return found;
    },
    [models, sel.model]
  );

  const query = useMemo(() => {
    const q = new URLSearchParams();
    (["style", "model", "finish", "color", "type", "width", "height"] as const).forEach((k) => {
      const v = (sel as any)[k];
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return q;
  }, [sel]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        // Используем данные из кэша вместо API запроса
        const cached = modelsCache.get('all');
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          const allModels = cached.data;
          const domain: any = {
            style: Array.from(new Set(allModels.map((m: any) => m.style))).sort(),
            finish: Array.from(new Set(allModels.flatMap((m: any) => m.options?.finishes || []))).sort(),
            color: Array.from(new Set(allModels.flatMap((m: any) => m.options?.colors || []))).sort(),
            type: Array.from(new Set(allModels.flatMap((m: any) => m.options?.types || []))).sort(),
            width: Array.from(new Set(allModels.flatMap((m: any) => m.options?.widths || []))).sort(),
            height: Array.from(new Set(allModels.flatMap((m: any) => m.options?.heights || []))).sort(),
            kits: [],
            handles: []
          };
          const response = { domain };
          if (!c && !sel.model) {
            setDomain(response.domain);
            console.log('🔍 Кэшированный domain установлен (нет выбранной модели)');
          } else {
            console.log('🔍 Пропускаем установку кэшированного domain - выбрана модель:', sel.model);
          }
          return;
        }
        
        const response = await api.getOptions(query);
        // Извлекаем domain из ответа API
        const domain = response?.domain || response;
        console.log('🔍 Общие данные загружены для query:', query, 'domain:', domain);
        // НЕ устанавливаем domain если уже выбрана модель
        if (!c && !sel.model) {
          setDomain(domain);
          console.log('🔍 Общий domain установлен (нет выбранной модели)');
        } else {
          console.log('🔍 Пропускаем установку общего domain - выбрана модель:', sel.model);
        }
      } catch (e: any) {
        if (!c) setErr(e?.message ?? "Ошибка доменов");
      }
    })();
    return () => {
      c = true;
    };
  }, []); // Временно отключаем зависимость от query

  // Сброс domain при смене стиля или модели
  useEffect(() => {
    if (!sel.model || !sel.style) {
      setDomain(null);
      return;
    }
  }, [sel.model, sel.style]);

  // Каскадная загрузка опций при изменении любого параметра (с дебаунсингом)
  useEffect(() => {
    if (!sel.model || !sel.style) {
      return;
    }
    
    // Дебаунсинг для предотвращения частых запросов
    const timeoutId = setTimeout(() => {
      let c = false;
    (async () => {
      try {
        setIsLoadingOptions(true);
        const query = new URLSearchParams();
        if (sel.style) query.set('style', sel.style);
        if (sel.model) query.set('model', sel.model);
        if (sel.finish) query.set('finish', sel.finish);
        if (sel.color) query.set('color', sel.color);
        if (sel.type) query.set('type', sel.type);
        if (sel.width) query.set('width', sel.width.toString());
        if (sel.height) query.set('height', sel.height.toString());
        // if (sel.edge) query.set('edge', sel.edge);

        const response = await fetch(`/api/catalog/doors/cascade-options?${query.toString()}`);
        const data = await response.json();
        
        
        if (!c && data.availableOptions) {
          // Обновляем только если получили новые данные
          setDomain(data.availableOptions);
        }
      } catch (e: any) {
        console.error('❌ Ошибка каскадной загрузки:', e);
        if (!c) setErr(e?.message ?? "Ошибка каскадной загрузки");
      } finally {
        if (!c) setIsLoadingOptions(false);
      }
    })();
    }, 300); // Дебаунсинг 300ms
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [sel.model, sel.style, sel.finish, sel.color, sel.type, sel.width, sel.height]);

  // Загрузка стоимости кромки при изменении параметров (временно отключено)
  // useEffect(() => {
  //   if (!sel.model || !sel.style) return;

  //   let c = false;
  //   (async () => {
  //     try {
  //       const query = new URLSearchParams();
  //       if (sel.style) query.set('style', sel.style);
  //       if (sel.model) query.set('model', sel.model);
  //       if (sel.finish) query.set('finish', sel.finish);
  //       if (sel.color) query.set('color', sel.color);
  //       if (sel.type) query.set('type', sel.type);
  //       if (sel.width) query.set('width', sel.width.toString());
  //       if (sel.height) query.set('height', sel.height.toString());

  //       const response = await fetch(`/api/catalog/doors/edge-cost?${query.toString()}`);
  //       const data = await response.json();
  //       
  //       if (!c) {
  //         setEdgeCostData(data);
  //       }
  //     } catch (e: any) {
  //       console.error('❌ Ошибка загрузки стоимости кромки:', e);
  //       if (!c) setErr(e?.message ?? "Ошибка загрузки стоимости кромки");
  //     }
  //   })();
  //   return () => {
  //     c = true;
  //   };
  // }, [sel.model, sel.style, sel.finish, sel.color, sel.type, sel.width, sel.height]);

  // Оптимизированная загрузка моделей и опций при изменении стиля
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const styleKey = sel.style || 'all';
        
        // Проверяем клиентский кэш для моделей с проверкой времени
        const cached = modelsCache.get('all');
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('✅ Используем предзагруженные данные');
          
          // Фильтруем модели по стилю в памяти
          const filteredModels = sel.style ? 
            cached.data.filter((model: any) => model.style === sel.style) : 
            cached.data;
          
          setModels(filteredModels);
          setIsLoadingModels(false);
          return;
        }
        
        // Если нет кэша, загружаем данные
        console.log('🔄 Загружаем данные для стиля:', sel.style || 'все');
        
        // Проверяем, не загружаются ли уже данные
        if (isLoadingModels) {
          console.log('⏸️ Данные уже загружаются, пропускаем');
          return;
        }
        
        setIsLoadingModels(true);
        
        // Оптимистичное обновление: показываем пустой список сразу
        if (!c) setModels([]);
        
        // Один оптимизированный запрос для всех данных
        const response = await fetch(`/api/catalog/doors/complete-data?style=${encodeURIComponent(sel.style || "")}`);
        
        if (!c && response.ok) {
          const data = await response.json();
          console.log('✅ Все данные загружены одним запросом:', data);
          
          const rows = data?.models || [];
          
          // Оптимизированная загрузка фото для всех моделей
          if (rows.length > 0) {
            try {
              const modelNames = rows.map((m: any) => m.model);
              const photoResponse = await fetch('/api/catalog/doors/photos-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ models: modelNames })
              });
              
              if (photoResponse.ok) {
                const photoData = await photoResponse.json();
                console.log('⚡ Batch загрузка фото завершена для', modelNames.length, 'моделей');
                console.log('📸 photoData:', photoData);
                
                // Объединяем данные моделей с фото
                const modelsWithPhotos = rows.map((model: any) => {
                  const photoInfo = photoData.photos[model.model];
                  console.log(`📸 Model ${model.model}:`, {
                    'photoInfo': photoInfo,
                    'model.photo': model.photo,
                    'final photo': photoInfo?.photo || model.photo,
                    'hasGallery': photoInfo?.photos?.gallery?.length > 0
                  });
                  return {
                    ...model,
                    photo: photoInfo?.photo || model.photo,
                    photos: photoInfo?.photos || model.photos,
                    hasGallery: photoInfo?.photos?.gallery?.length > 0 || false
                  };
                });
                
                console.log('📸 Первые 3 модели с фото:', modelsWithPhotos.slice(0, 3));
                
                setModels(modelsWithPhotos);
                
                // Сохраняем в клиентский кэш с фото
                setModelsCache(prev => {
                  const newCache = new Map(prev);
                  newCache.set(styleKey, {
                    data: modelsWithPhotos,
                    timestamp: Date.now()
                  });
                  return newCache;
                });
              } else {
                setModels(rows);
                
                // Сохраняем в кэш без фото
                setModelsCache(prev => {
                  const newCache = new Map(prev);
                  newCache.set(styleKey, {
                    data: rows,
                    timestamp: Date.now()
                  });
                  return newCache;
                });
              }
            } catch (photoError) {
              console.warn('⚠️ Ошибка batch загрузки фото, используем обычную:', photoError);
              setModels(rows);
              
              // Сохраняем в кэш без фото
              setModelsCache(prev => {
                const newCache = new Map(prev);
                newCache.set(styleKey, {
                  data: rows,
                  timestamp: Date.now()
                });
                return newCache;
              });
            }
          } else {
            setModels(rows);
            
            // Сохраняем в кэш без фото
            setModelsCache(prev => {
              const newCache = new Map(prev);
              newCache.set(styleKey, {
                data: rows,
                timestamp: Date.now()
              });
              return newCache;
            });
          }
          
          setIsLoadingModels(false);
        } else if (!c) {
          console.error('❌ Ошибка загрузки данных:', response.status);
          setIsLoadingModels(false);
        }
      } catch (error) {
        console.error('Error loading models and options:', error);
        if (!c) setIsLoadingModels(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [sel.style]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!hasBasic(sel)) {
        setPrice(null);
        return;
      }
      try {
        const p = await api.price(sel);
        
        // API уже включает комплект фурнитуры и ручку в расчет
        if (!c) {
          setPrice(p);
        }
      } catch (e: any) {
        if (!c) setErr(e?.message ?? "Ошибка расчёта");
      }
    })();
    return () => {
      c = true;
    };
  }, [sel, hardwareKits, handles]);

  // Предзагрузка всех данных при загрузке страницы
  useEffect(() => {
    const preloadAllData = async () => {
      try {
        console.log('🚀 Предзагрузка всех данных...');
        const response = await fetch('/api/catalog/doors/complete-data');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Все данные предзагружены:', data);
          
          const rows = data?.models || [];
          
          // Загружаем фото для всех моделей
          if (rows.length > 0) {
            try {
              const modelNames = rows.map((m: any) => m.model);
              const photoResponse = await fetch('/api/catalog/doors/photos-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ models: modelNames })
              });
              
              if (photoResponse.ok) {
                const photoData = await photoResponse.json();
                console.log('⚡ Предзагрузка фото завершена для', modelNames.length, 'моделей');
                
                // Объединяем данные моделей с фото
                const modelsWithPhotos = rows.map((model: any) => {
                  const photoInfo = photoData.photos[model.model];
                  return {
                    ...model,
                    photo: photoInfo?.photo || model.photo,
                    photos: photoInfo?.photos || model.photos,
                    hasGallery: photoInfo?.photos?.gallery?.length > 0 || false
                  };
                });
                
                // Сохраняем в кэш с фото
                setModelsCache(prev => {
                  const newCache = new Map(prev);
                  newCache.set('all', {
                    data: modelsWithPhotos,
                    timestamp: Date.now()
                  });
                  return newCache;
                });
              } else {
                // Сохраняем без фото
                setModelsCache(prev => {
                  const newCache = new Map(prev);
                  newCache.set('all', {
                    data: rows,
                    timestamp: Date.now()
                  });
                  return newCache;
                });
              }
            } catch (photoError) {
              console.warn('⚠️ Ошибка предзагрузки фото:', photoError);
              // Сохраняем без фото
              setModelsCache(prev => {
                const newCache = new Map(prev);
                newCache.set('all', {
                  data: rows,
                  timestamp: Date.now()
                });
                return newCache;
              });
            }
          }
        }
      } catch (error) {
        console.log('❌ Ошибка предзагрузки:', error);
      }
    };
    
    preloadAllData();
  }, []);

  // Загружаем данные фурнитуры
  useEffect(() => {
    const loadHardwareData = async () => {
      try {
        console.log('🔧 Загружаем данные фурнитуры...');
        
        // Загружаем комплекты фурнитуры
        const kitsResponse = await fetch('/api/catalog/hardware?type=kits');
        const kits = await kitsResponse.json();
        setHardwareKits(kits);
        console.log('🔧 Комплекты загружены:', kits);
        
        // Загружаем ручки
        const handlesResponse = await fetch('/api/catalog/hardware?type=handles');
        const handlesData = await handlesResponse.json();
        setHandles(handlesData);
        console.log('🔧 Ручки загружены:', handlesData);
        
        // Устанавливаем базовые значения по умолчанию
        const basicKit = kits.find((k: any) => k.isBasic);
        const basicHandle = Object.values(handlesData).flat().find((h: any) => h.isBasic);
        
        if (basicKit || basicHandle) {
          setSel(prev => {
            const newSel = { ...prev };
            if (basicKit) {
              newSel.hardware_kit = { id: (basicKit as any).id };
            }
            if (basicHandle) {
              newSel.handle = { id: (basicHandle as any).id };
            }
            return newSel;
          });
          console.log('🔧 Установлены базовые значения:', { basicKit, basicHandle });
        }
        
      } catch (error) {
        console.error('Ошибка загрузки данных фурнитуры:', error);
      }
    };
    
    loadHardwareData();
  }, []);

  // Автоматическое сворачивание блока стилей при выборе стиля + мгновенная фильтрация
  useEffect(() => {
    if (sel.style) {
      setIsStyleCollapsed(true);
      // Сбрасываем состояние сворачивания моделей при смене стиля
      setIsModelCollapsed(false);
      
      // Мгновенная фильтрация из кэша
      const cached = modelsCache.get('all');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('⚡ Мгновенная фильтрация для стиля:', sel.style);
        const filteredModels = cached.data.filter((model: any) => model.style === sel.style);
        setModels(filteredModels);
        setIsLoadingModels(false);
      }
    } else {
      // Если стиль не выбран, разворачиваем блок стилей
      setIsStyleCollapsed(false);
      setIsModelCollapsed(false);
    }
  }, [sel.style, modelsCache]);


  // Префилл по ?sku=...
  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const sku = params.get("sku");
    if (!sku) return;

    let cancel = false;
    (async () => {
      try {
        const { ok, selection } = await resolveSelectionBySku(sku);
        if (!ok || cancel) return;
        setSel((prev) => ({ ...prev, ...selection }));
      } catch {
        // ignore
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  const addToCart = () => {
    if (!price) return;
    
    // Добавляем дверь с комплектом
    const item: CartItem = {
      id: uid(),
      type: 'door', // Указываем тип товара
      style: sel.style,
      model: sel.model,
      finish: sel.finish,
      width: sel.width,
      height: sel.height,
      color: sel.color,
      qty: quantity,
      unitPrice: price.total,
      sku_1c: price.sku_1c,
      hardwareKitId: (sel.hardware_kit && sel.hardware_kit.id) || undefined,
      hardwareKitName: sel.hardware_kit ? hardwareKits.find(k => k.id === sel.hardware_kit?.id)?.name : undefined, // Добавляем название комплекта
      baseAtAdd: price.total,
    };
    
    const newCart = [...cart, item];
    
    // Если выбрана ручка, добавляем её отдельной строкой
    if (sel.handle && sel.handle.id) {
      const handle = Object.values(handles).flat().find((h: Handle) => h.id === sel.handle!.id);
      const handleItem: CartItem = {
        id: uid(),
        type: 'handle', // Указываем тип товара
        style: sel.style,
        model: sel.model,
        finish: sel.finish,
        width: sel.width,
        height: sel.height,
        color: sel.color,
        qty: quantity,
        unitPrice: handle ? handle.price : 0,
        handleId: sel.handle.id,
        handleName: handle ? handle.name : 'Неизвестная ручка', // Добавляем название ручки
        sku_1c: price.sku_1c,
        baseAtAdd: 0,
      };
      newCart.push(handleItem);
    }
    
    setCart(newCart);
    
    // Сохраняем исходные цены для новых товаров
    const newItems = newCart.filter(item => !cart.find(cartItem => cartItem.id === item.id));
    const newOriginalPrices: Record<string, number> = {};
    newItems.forEach(item => {
      newOriginalPrices[item.id] = item.unitPrice;
    });
    setOriginalPrices(prev => ({ ...prev, ...newOriginalPrices }));
    
    setShowQuantityModal(false);
    setQuantity(1);
  };

  const handleAddToCartClick = () => {
    setShowQuantityModal(true);
  };
  const removeFromCart = (id: string) =>
    setCart((c) => c.filter((i) => i.id !== id));
  const changeQty = (id: string, qty: number) =>
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));

  const ensureItemDomain = async (item: { model: string; style?: string }) => {
    if (itemDomains[item.model]) return itemDomains[item.model];
    
    // Используем данные из кэша
    const cached = modelsCache.get('all');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const allModels = cached.data;
      const modelData = allModels.find((m: any) => m.model === item.model);
      if (modelData) {
        const domain = {
          finish: modelData.options?.finishes || [],
          color: modelData.options?.colors || [],
          type: modelData.options?.types || [],
          width: modelData.options?.widths || [],
          height: modelData.options?.heights || []
        };
        setItemDomains((m) => ({ ...m, [item.model]: domain }));
        return domain;
      }
    }
    
    // Fallback к старому API
    const q = new URLSearchParams();
    q.set("model", item.model);
    if (item.style) q.set("style", item.style);
    try {
      const r = await api.getOptions(q);
      setItemDomains((m) => ({ ...m, [item.model]: r.domain }));
      return r.domain;
    } catch {
      return null;
    }
  };

  const recalcItem = async (id: string) => {
    const it = cart.find((x) => x.id === id);
    if (!it) return;
    const selection: any = {
      style: it.style,
      model: it.model,
      finish: it.finish,
      color: it.color,
      type: it.type,
      width: it.width,
      height: it.height,
      hardware_kit: it.hardwareKitId ? { id: it.hardwareKitId } : undefined,
      handle: it.handleId ? { id: it.handleId } : undefined,
    };
    try {
      const p = await api.price(selection);
      setCart((c) =>
        c.map((x) => (x.id === id ? { ...x, unitPrice: p.total, sku_1c: p.sku_1c } : x))
      );
    } catch {
      /* keep old price */
    }
  };

  const changeItem = (id: string, patch: Partial<CartItem>) => {
    setCart((c) => c.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const download = (filename: string, mime: string, content: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const checkClientBeforeExport = (exportFunction: () => void) => {
    if (!selectedClient) {
      setShowClientModal(true);
      return;
    }
    exportFunction();
  };

  // ADMIN
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [token, setToken] = useState("");
  const [category, setCategory] = useState("doors");
  const [out, setOut] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const DEFAULT_MAPPING = `{
  "mapping": {
    "model": "Модель",
    "style": "Стиль",
    "finish": "Покрытие",
    "domeo_color": "Цвет",
    "type": "Тип",
    "width": "Ширина",
    "height": "Высота",
    "rrc_price": "РРЦ",
    "photo_url": "Фото"
  },
  "uniqueBy": ["model","finish","domeo_color","type","width","height"],
  "sheet": "Каталог",
  "startRow": 2
}`;
  const [mappingText, setMappingText] = useState<string>(DEFAULT_MAPPING);
  const [importInfo, setImportInfo] =
    useState<null | { ok: boolean; status: number; body?: any }>(null);

  const [modelForPhoto, setModelForPhoto] = useState("");
  const [mediaInfo, setMediaInfo] =
    useState<null | { ok: boolean; status: number; body?: any }>(null);

  // восстановить токен из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("domeo_token");
      if (saved) setToken(saved);
    } catch {}
  }, []);

  const reg = async () => {
    if (!API) {
      setOut("MOCK: registration skipped (set window.__API_URL__)");
      return;
    }
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setOut("Введите корректный email");
      return;
    }
    if (password.length < 6) {
      setOut("Пароль должен быть не короче 6 символов");
      return;
    }
    setAuthBusy(true);
    try {
      const r = await realApi.register(email, password);
      setOut(`${r.ok ? "OK" : "ERR"} ${r.status}: ${r.text}`);
    } catch (e: any) {
      setOut(`ERR: ${e?.message || "registration failed"}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const login = async () => {
    if (!API) {
      setToken("mock-token");
      setOut("MOCK: logged in");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setOut("Укажите email и пароль");
      return;
    }
    setAuthBusy(true);
    try {
      const r = await realApi.login(email, password);
      setOut(`${r.ok ? "OK" : "ERR"} ${r.status}: ${r.text}`);
      if (r.token) {
        setToken(r.token);
        try {
          localStorage.setItem("domeo_token", r.token);
        } catch {}
      }
    } catch (e: any) {
      setOut(`ERR: ${e?.message || "login failed"}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = () => {
    setToken("");
    try {
      localStorage.removeItem("domeo_token");
    } catch {}
    setOut("Вышли из аккаунта");
  };

  const importPrice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fileInput =
      (form.elements.namedItem("price") as HTMLInputElement | null) ?? null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setOut("Выберите файл");
      return;
    }
    if (!API) {
      setOut("MOCK: import skipped");
      return;
    }
    const mappingStr = mappingText && mappingText.trim() ? mappingText : undefined;
    const r = await realApi.importPrice(token, category, file, mappingStr);
    setOut(`${r.ok ? "OK" : "ERR"} ${r.status}: ${r.text}`);
    let body: any = {};
    try {
      body = JSON.parse(r.text);
    } catch {}
    setImportInfo({ ok: r.ok, status: r.status, body });
  };

  const uploadMedia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const filesInput =
      (form.elements.namedItem("media") as HTMLInputElement | null) ?? null;
    const files = filesInput?.files;
    if (!files || !files.length) {
      setOut("Выберите файл(ы)");
      return;
    }
    if (!API) {
      setOut("MOCK: media upload skipped");
      return;
    }
    const r = await realApi.uploadMedia(token, modelForPhoto, files);
    setOut(`${r.ok ? "OK" : "ERR"} ${r.status}: ${r.text}`);
    let body: any = {};
    try {
      body = JSON.parse(r.text);
    } catch {}
    setMediaInfo({ ok: r.ok, status: r.status, body });
  };

  const getExportCart = React.useCallback((): any[] => {
    return cart.map((c) => ({
      model: c.model as string,
      width: c.width as number,
      height: c.height as number,
      color: c.color as string | undefined,
      qty: c.qty as number,
      finish: (c as any).finish as string | undefined,
      type: (c as any).type as string | undefined,
      productId:
        (c as any).productId ??
        `${c.model}-${c.width}x${c.height}-${c.color ?? ""}`,
    }));
  }, [cart]);

  // Функции для расчета дельт (только для отображения) - удалены, дельта показывается только в менеджере корзины

  // Функции генерации документов
  const generateDocument = async (type: 'quote' | 'invoice' | 'order') => {
    if (cart.length === 0) {
      alert('Корзина пуста');
      return;
    }

    if (!selectedClient) {
      setShowClientManager(true);
      return;
    }

    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          type,
          clientId: selectedClient,
          items: cart.map(item => ({
            id: item.id,
            model: item.model,
            finish: item.finish,
            color: item.color,
            width: item.width,
            height: item.height,
            qty: item.qty,
            unitPrice: item.unitPrice,
            sku_1c: item.sku_1c,
            hardwareKitId: item.hardwareKitId,
            hardwareKitName: item.hardwareKitId ? hardwareKits.find(k => k.id === item.hardwareKitId)?.name : undefined,
            handleId: item.handleId,
            description: item.handleId ? Object.values(handles).flat().find(h => h.id === item.handleId)?.name : undefined
          })),
          totalAmount: cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
        })
      });

      if (response.ok) {
        // Для всех типов документов скачиваем файлы
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        if (type === 'order') {
          a.download = `Заказ_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
          a.download = `${type === 'quote' ? 'КП' : 'Счет'}_${new Date().toISOString().split('T')[0]}.pdf`;
        }
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Ошибка при генерации документа');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Ошибка при генерации документа');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b-2 border-gray-300">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center">
            <div className="flex items-baseline space-x-3 flex-1 min-w-0">
              <Link href="/" className="text-2xl font-bold text-black">
                Domeo
              </Link>
              <span className="text-black text-lg font-bold">•</span>
              <span className="text-lg font-semibold text-black">Doors</span>
            </div>
            <nav className="flex items-center space-x-4 justify-end flex-shrink-0 ml-auto">
              {isAuthenticated && <NotificationBell userRole={user?.role || "executor"} />}
              <Link 
                href="/" 
                className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
              >
              ← Категории
            </Link>
            {isAuthenticated && (
              <button
                onClick={() => setShowClientManager(true)}
                className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
              >
                👤 {selectedClientName || 'Заказчик'}
              </button>
            )}
            {tab === "admin" && (
              <button
                onClick={() => setTab("admin")}
                className={`px-3 py-1 border transition-all duration-200 text-sm ${
                  tab === "admin" 
                    ? "bg-black text-white border-black" 
                    : "border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                Админ
              </button>
            )}
            
            
            <button
              onClick={() => {
                // Сохраняем текущие цены как базовые для расчета дельты
                const basePrices: Record<string, number> = {};
                cart.forEach(item => {
                  basePrices[item.id] = item.unitPrice;
                });
                setCartManagerBasePrices(basePrices);
                setShowCartManager(true);
              }}
              className="flex items-center space-x-2 px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
            >
              <span>🛒</span>
              <span>Корзина</span>
              {cart.length > 0 && (
                <span className="border border-black text-black text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>
          </nav>
          </div>
        </div>
      </header>

      {tab === "config" && (
        <div className={`max-w-[1600px] mx-auto grid grid-cols-1 gap-8 p-6 transition-all duration-300 ${
          hideSidePanels ? 'lg:grid-cols-1' : 'lg:grid-cols-3'
        }`}>
          <main className={`space-y-4 transition-all duration-300 ${
            hideSidePanels ? 'lg:col-span-1' : 'lg:col-span-1'
          }`}>
            <section>
              <div className="mb-2">
                {sel.style ? (
                  <button
                    onClick={() => setIsStyleCollapsed(!isStyleCollapsed)}
                    className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
                    aria-label={isStyleCollapsed ? "Развернуть стили" : "Свернуть стили"}
                  >
                    <h2 className="text-xl font-semibold text-black flex items-center">
                      Стиль
                      <span className="text-black text-lg font-bold mx-3">•</span>
                      <span className="text-lg font-medium text-gray-900">{sel.style}</span>
                    </h2>
                    
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                        isStyleCollapsed ? '' : 'rotate-180'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <h2 className="text-xl font-semibold text-black">Стиль</h2>
                )}
              </div>
              
              
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isStyleCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
              }`}>
              {isLoadingModels ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <span className="ml-3 text-gray-600">Загрузка стилей...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {styleTiles.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      setSel((v) => {
                        const newSel = resetDependentParams(v, 'style');
                        newSel.style = s.key;
                        return newSel;
                      });
                      setIsModelSelected(false);
                      setIsModelCollapsed(false);
                      setIsLoadingModels(false);
                    }}
                    className={`group overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ring-offset-2 ${
                      sel.style === s.key 
                        ? "bg-gray-50" 
                        : "hover:bg-gray-50"
                    }`}
                    aria-label={`Выбрать стиль ${s.key}`}
                  >
                    <div className="aspect-[16/33] flex items-center justify-center bg-white p-2">
                      {s.key === 'Скрытая' && (
                        <svg className="w-[80px] h-[160px] text-gray-400" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="0.3">
                          {/* Скрытая дверь - только контур */}
                          <rect x="2" y="2" width="14" height="32" rx="0.5"/>
                          {/* Минимальная ручка - горизонтальная линия */}
                          <line x1="13" y1="18" x2="15" y2="18"/>
                        </svg>
                      )}
                      {s.key === 'Современная' && (
                        <svg className="w-[80px] h-[160px] text-gray-400" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="0.3">
                          {/* Современная дверь - контур + вертикальная панель */}
                          <rect x="2" y="2" width="14" height="32" rx="0.5"/>
                          <rect x="5" y="4" width="8" height="28" rx="0.3"/>
                          {/* Простая ручка - горизонтальная линия */}
                          <line x1="13" y1="18" x2="15" y2="18"/>
                        </svg>
                      )}
                      {s.key === 'Неоклассика' && (
                        <svg className="w-[80px] h-[160px] text-gray-400" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="0.3">
                          {/* Неоклассика - контур + две панели */}
                          <rect x="2" y="2" width="14" height="32" rx="0.5"/>
                          <rect x="4" y="4" width="10" height="14" rx="0.3"/> {/* Верхняя панель */}
                          <rect x="4" y="20" width="10" height="8" rx="0.3"/> {/* Нижняя панель */}
                          {/* Круглая ручка */}
                          <circle cx="13" cy="18" r="0.8"/>
                        </svg>
                      )}
                      {s.key === 'Классика' && (
                        <svg className="w-[80px] h-[160px] text-gray-400" viewBox="0 0 18 36" fill="none" stroke="currentColor" strokeWidth="0.3">
                          {/* Классика - контур + две панели с молдингами */}
                          <rect x="2" y="2" width="14" height="32" rx="0.5"/>
                          {/* Верхняя панель с молдингом */}
                          <rect x="4" y="4" width="10" height="14" rx="0.3"/>
                          <rect x="5" y="5" width="8" height="12" rx="0.2"/>
                          {/* Нижняя панель с молдингом */}
                          <rect x="4" y="20" width="10" height="8" rx="0.3"/>
                          <rect x="5" y="21" width="8" height="6" rx="0.2"/>
                          {/* Классическая ручка - рычаг */}
                          <line x1="13" y1="17" x2="13" y2="19"/>
                          <line x1="13" y1="17" x2="12" y2="17"/>
                        </svg>
                      )}
                    </div>
                    <div className="text-center h-6 flex items-center justify-center px-1">
                      <div className="font-medium text-black text-xs leading-tight">{s.key}</div>
                    </div>
                  </button>
                ))}
              </div>
              )}
              </div>
            </section>

            {sel.style && (
              <section>
                <div className="mb-2">
                  {sel.model ? (
                  <button
                      onClick={() => setIsModelCollapsed(!isModelCollapsed)}
                      className="w-full flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200"
                      aria-label={isModelCollapsed ? "Развернуть модели" : "Свернуть модели"}
                    >
                      <h2 className="text-xl font-semibold text-black flex items-center">
                        Модель
                        <span className="text-black text-lg font-bold mx-3">•</span>
                        <span className="text-lg font-medium text-gray-900">{selectedModelCard ? formatModelNameForCard(selectedModelCard.model) : sel.model}</span>
                      </h2>
                      
                      <svg 
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          isModelCollapsed ? '' : 'rotate-180'
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                  </button>
                  ) : (
                    <h2 className="text-xl font-semibold text-black">Модели</h2>
                  )}
                </div>
                
                
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isModelCollapsed ? 'max-h-0 opacity-0' : 'opacity-100'
                }`}>
                {isLoadingModels ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <span className="ml-3 text-gray-600">Загрузка моделей...</span>
                  </div>
                ) : Array.isArray(models) && models.length ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                    {models.map((m) => (
                      <DoorCard
                        key={m.model}
                        item={m}
                        selected={sel.model === m.model}
                          onSelect={() => setSel((v) => {
                            const newSel = resetDependentParams(v, 'model');
                            newSel.model = m.model; // Используем полное название модели
                            newSel.style = m.style;
                            return newSel;
                          })}
                      />
                    ))}
                  </div>
                  </>
                ) : (
                  <div className="text-gray-600 text-center py-8">Нет моделей для выбранного стиля</div>
                )}
                </div>
              </section>
            )}

            {/* Блок выбора параметров - появляется после сворачивания моделей */}
            {sel.model && isModelSelected && isModelCollapsed && (
              <section className="space-y-6">

                {/* Материалы и отделка */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Материалы и отделка</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Покрытие"
                    value={sel.finish || ""}
                    onChange={(v: string) => setSel((s) => {
                      const newSel = resetDependentParams(s, 'finish');
                      newSel.finish = v;
                      return newSel;
                    })}
                    options={(domain?.finish || []) as string[]}
                    allowEmpty={true}
                  />
                  <Select
                    label="Цвет"
                    value={sel.color || ""}
                    onChange={(v: string) => setSel((s) => {
                      const newSel = resetDependentParams(s, 'color');
                      newSel.color = v;
                      return newSel;
                    })}
                    options={sel.finish ? (domain?.color || []) as string[] : []}
                    allowEmpty={true}
                    disabled={!sel.finish}
                  />
                  </div>
                </div>

                {/* Размеры */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Размеры</h3>
                  <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Ширина"
                    value={sel.width?.toString() || ""}
                    onChange={(v: string) => setSel((s) => {
                      const newSel = resetDependentParams(s, 'width');
                      newSel.width = Number(v);
                      return newSel;
                    })}
                    options={domain?.width ? ((domain.width) as number[]).map(String) : []}
                    allowEmpty={true}
                    disabled={!sel.color}
                    isLoading={isLoadingOptions}
                  />
                  <Select
                    label="Высота"
                    value={sel.height?.toString() || ""}
                    onChange={(v: string) => setSel((s) => {
                      const newSel = resetDependentParams(s, 'height');
                      newSel.height = Number(v);
                      return newSel;
                    })}
                    options={domain?.height ? ((domain.height) as number[]).map(String) : []}
                    allowEmpty={true}
                    disabled={!sel.width}
                    isLoading={isLoadingOptions}
                  />
                  </div>
                </div>

                {/* Дополнительные элементы (временно отключено) */}

                {/* Фурнитура */}
                    <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Фурнитура</h3>
                  <div className="space-y-4">
                    <HardwareSelect
                        label="Комплект фурнитуры"
                      value={sel.hardware_kit?.id || ""}
                      onChange={(v: string) => setSel((s) => ({ 
                        ...s, 
                        hardware_kit: v ? { id: v } : undefined
                      }))}
                      options={sel.width && sel.height ? hardwareKits.map(kit => ({
                        id: kit.id,
                        name: kit.name,
                        price: kit.price,
                        description: kit.description
                      })) : []}
                      allowEmpty={true}
                      disabled={!sel.width || !sel.height}
                    />
                    <div className="text-sm space-y-1">
                      <div className="text-gray-600">Ручка</div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowHandleModal(true)}
                      disabled={!sel.hardware_kit}
                          className={`flex-1 border border-black/20 px-3 py-2 text-left text-black ${
                            !sel.hardware_kit ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
                          }`}
                        >
                          {sel.handle?.id ? 
                            Object.values(handles).flat().find(h => h.id === sel.handle?.id)?.name || 'Выберите ручку' :
                            'Выберите ручку'
                          }
                        </button>
                        {sel.handle?.id && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowHandleInfo(!showHandleInfo)}
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title="Показать описание"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <div className="text-sm font-medium text-gray-900 min-w-[80px] text-right">
                              {(() => {
                                const selectedHandle = sel.handle?.id ? Object.values(handles).flat().find(h => h.id === sel.handle?.id) : undefined;
                                return selectedHandle?.price !== undefined ? `${fmtInt(selectedHandle.price)} ₽` : '';
                              })()}
                            </div>
                          </div>
                        )}
                        {/* Информация о ручке */}
                        {showHandleInfo && sel.handle?.id && (() => {
                          const selectedHandle = Object.values(handles).flat().find(h => h.id === sel.handle?.id);
                          if (!selectedHandle) return null;
                          return (
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                              <div className="space-y-1">
                                <div><span className="font-medium">Группа:</span> {selectedHandle.group || 'Не указана'}</div>
                                <div><span className="font-medium">Поставщик:</span> {selectedHandle.supplier || 'Не указан'}</div>
                                <div><span className="font-medium">Наименование:</span> {selectedHandle.factoryName || 'Не указано'}</div>
                                <div><span className="font-medium">Артикул:</span> {selectedHandle.article || 'Не указан'}</div>
                                <div><span className="font-medium">Наличие в шоуруме:</span> {selectedHandle.showroom ? 'Да' : 'Нет'}</div>
                                <div><span className="font-medium">Цена:</span> {fmtInt(selectedHandle.price)} ₽</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    </div>
                  </div>

                {/* Общая стоимость конфигурации */}
                {price && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-4 border-t-2 border-t-gray-300">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-medium text-gray-700">Стоимость конфигурации</h3>
                      <div className="text-xl font-bold text-gray-900">
                        {fmtInt(price.total)} ₽
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="space-y-1">
                        {/* Дверь + комплект фурнитуры */}
                        <div className="flex justify-between">
                          <span>
                            {sel.style && sel.model && sel.finish && sel.color && sel.width && sel.height && sel.hardware_kit?.id
                              ? `Дверь ${selectedModelCard ? formatModelNameForCard(selectedModelCard.model) : formatModelNameForCard(sel.model)} + комплект фурнитуры ${hardwareKits.find((k: HardwareKit) => k.id === sel.hardware_kit!.id)?.name.replace('Комплект фурнитуры — ', '') || 'Базовый'}`
                              : "Дверь"}
                          </span>
                          <span>
                            {price?.breakdown?.find((item: any) => item.label === 'Дверь')?.amount && price?.breakdown?.find((item: any) => item.label.startsWith('Комплект:'))?.amount
                              ? `${fmtInt((price.breakdown.find((item: any) => item.label === 'Дверь').amount || 0) + (price.breakdown.find((item: any) => item.label.startsWith('Комплект:'))?.amount || 0))} ₽`
                              : price?.breakdown?.find((item: any) => item.label === 'Дверь')?.amount
                                ? `${fmtInt(price.breakdown.find((item: any) => item.label === 'Дверь').amount)} ₽`
                                : "—"}
                          </span>
                </div>
                        
                        {/* Ручка */}
                        {sel.handle?.id && (
                          <div className="flex justify-between">
                            <span>
                              {(() => {
                                const selectedHandle = sel.handle?.id ? Object.values(handles).flat().find((h: Handle) => h.id === sel.handle!.id) : undefined;
                                return selectedHandle?.name ? `Ручка ${selectedHandle.name}` : "Ручка";
                              })()}
                            </span>
                            <span>
                              {(() => {
                                const selectedHandle = sel.handle?.id ? Object.values(handles).flat().find((h: Handle) => h.id === sel.handle!.id) : undefined;
                                return selectedHandle?.price !== undefined ? `${fmtInt(selectedHandle.price)} ₽` : "—";
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    disabled={!hasBasic(sel)}
                    onClick={handleAddToCartClick}
                    className="px-6 py-3 bg-black text-white hover:bg-yellow-400 hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    В корзину
                  </button>
                  {kpHtml && (
                    <button
                      className="px-6 py-3 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-lg font-bold"
                      onClick={() => setKpHtml("")}
                    >
                      Скрыть КП
                    </button>
                  )}
                </div>

                {kpHtml && (
                  <div className="bg-white border border-black/10 p-6">
                    <h3 className="text-lg font-semibold text-black mb-4">Предпросмотр КП</h3>
                    <iframe className="w-full h-80 border border-black/10" srcDoc={kpHtml} />
                  </div>
                )}
              </section>
            )}

          </main>

          {/* Центральная секция - превью модели */}
          <section className={`transition-all duration-300 ${
            hideSidePanels ? 'lg:col-span-1' : 'lg:col-span-1'
          }`}>
            <div className={`mx-auto transition-all duration-300 ${
              hideSidePanels ? 'max-w-4xl' : 'max-w-md'
            }`}>
            <div className="sticky top-6">
              {sel.model ? (
                <div className="transition-all duration-500 ease-in-out">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-black">
                      {selectedModelCard ? selectedModelCard.model.replace(/_/g, ' ') : "Выберите модель"}
                    </h3>
                  </div>
                  {/* Профессиональная галерея с увеличенным размером */}
                  <div className="w-full bg-white rounded-xl shadow-lg overflow-visible">
                    <div className="aspect-[4/6.5] overflow-hidden rounded-t-xl">
                    {selectedModelCard?.photos && (selectedModelCard.photos.cover || selectedModelCard.photos.gallery.length > 0) ? (
                      <ModernPhotoGallery
                        photos={selectedModelCard.photos}
                        productName={selectedModelCard.model}
                        hasGallery={selectedModelCard.hasGallery || false}
                        onToggleSidePanels={setHideSidePanels}
                      />
                    ) : selectedModelCard?.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedModelCard.photo.startsWith('/uploads') ? `/api${selectedModelCard.photo}` : `/api/uploads${selectedModelCard.photo}`}
                        alt={selectedModelCard.model}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="text-sm">Нет фото</div>
                          <div className="text-[14px] whitespace-nowrap">
                            {selectedModelCard ? formatModelNameForCard(selectedModelCard.model) : ""}
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  
                  {/* Кнопка Выбрать под превью - показывается только когда модели развернуты */}
                  {sel.model && !isModelCollapsed && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleModelSelect}
                        disabled={!sel.model}
                        className={`px-6 py-3 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-black ${
                          sel.model
                            ? 'bg-white text-black hover:bg-black hover:text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Выбрать
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[2/3] w-full bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="text-sm">Выберите модель</div>
                  </div>
                </div>
              )}
            </div>
            </div>
          </section>

          <aside className={`lg:col-span-1 transition-all duration-300 ${hideSidePanels ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} style={{ width: '110%' }}>
            <div className="sticky top-6 space-y-6">
              {/* Блок параметров - показывает выбранные параметры */}
              {(sel.style || sel.model || sel.finish || sel.color || sel.width || sel.height) && (
              <div className="bg-white border border-black/10 p-6 border-b-2 border-b-gray-300">
                <h2 className="text-xl font-semibold text-black mb-4">Параметры</h2>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Стиль:</span>
                    <span className="text-black font-medium">{sel.style || "—"}</span>
                  </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Модель:</span>
                      <span className="text-black font-medium">{selectedModelCard ? formatModelNameForCard(selectedModelCard.model) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Покрытие и цвет:</span>
                    <span className="text-black font-medium">
                    {sel.finish && sel.color
                      ? `${sel.finish}, ${sel.color}`
                      : sel.finish
                        ? sel.finish
                        : sel.color
                          ? sel.color
                          : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Размеры:</span>
                    <span className="text-black font-medium">
                    {sel.width && sel.height
                      ? `${sel.width} × ${sel.height} мм`
                      : sel.width
                        ? `${sel.width} мм`
                        : sel.height
                          ? `${sel.height} мм`
                          : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Комплект фурнитуры:</span>
                    <span className="text-black font-medium">
                      {sel.hardware_kit?.id
                        ? hardwareKits.find((k: HardwareKit) => k.id === sel.hardware_kit!.id)?.name.replace('Комплект фурнитуры — ', '') || "—"
                        : "—"}
                    </span>
                </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ручка:</span>
                    <span className="text-black font-medium">
                      {sel.handle?.id
                        ? Object.values(handles).flat().find((h: Handle) => h.id === sel.handle!.id)?.name || "—"
                        : "—"}
                    </span>
                </div>
                  {/* <div className="flex justify-between">
                    <span className="text-gray-600">Кромка:</span>
                    <span className="text-black font-medium">
                    {sel.edge && sel.edge !== "Нет" && sel.edge !== "нет"
                      ? sel.edge === "Да" && sel.edge_cost
                        ? `Да (${sel.edge_cost})`
                        : sel.edge_note
                          ? `${sel.edge}, ${sel.edge_note}`
                          : sel.edge
                      : "Отсутствует"}
                    </span>
                  </div> */}
              </div>
              </div>
              )}



              {/* Корзина - показывается всегда */}
              <div className="bg-white border border-black/10 p-5 transition-all duration-700 ease-in-out">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-black">Корзина ({cart.length})</h2>
                    {selectedClientName && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                        <span>👤</span>
                        <span>{selectedClientName}</span>
                      </div>
                    )}
                  </div>
                <div className="text-sm text-gray-600">
                    Итого:{" "}
                  <span className="font-semibold text-black text-base">
                      {fmtInt(cart.reduce((s, i) => s + i.unitPrice * i.qty, 0))} ₽
                    </span>
                  </div>
                </div>
                
                {cart.length ? (
                  <div className="space-y-2">
                    {cart.map((i) => {
                      // Если это ручка, отображаем отдельно
                      if (i.handleId) {
                        // ИСПРАВЛЕНИЕ: Всегда используем актуальное имя из каталога, а не item.handleName
                        const handle = Object.values(handles).flat().find((h: Handle) => h.id === i.handleId);
                        const currentHandleName = handle?.name || i.handleName || "Ручка";
                        return (
                          <div key={i.id} className="border border-black/10 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-black text-sm">
                                {currentHandleName ? `Ручка ${currentHandleName}` : "Ручка"}
                          </div>
                              <div className="text-sm">
                                <span className="text-gray-600">{i.qty}×{fmtInt(i.unitPrice)}</span>
                                <span className="font-semibold text-black ml-3">{fmtInt(i.unitPrice * i.qty)} ₽</span>
                          </div>
                        </div>
                        </div>
                        );
                      }
                      
                      // Иначе отображаем дверь с комплектом
                      return (
                        <div key={i.id} className="border border-black/10 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <div className="font-medium text-black">
                                {i.type === 'handle' 
                                  ? (() => {
                                      const displayHandle = i.handleId ? Object.values(handles).flat().find((h: Handle) => h.id === i.handleId) : null;
                                      return `Ручка ${displayHandle?.name || i.handleName || 'Неизвестная ручка'}`;
                                    })()
                                  : `Дверь DomeoDoors ${i.model?.replace(/DomeoDoors_/g, '').replace(/_/g, ' ') || 'Неизвестная модель'}`
                                }
                              </div>
                              <div className="text-gray-600 text-xs font-normal">
                                {i.type === 'handle' 
                                  ? `(Ручка для двери)`
                                  : `(${i.finish}, ${i.color}, ${i.width} × ${i.height} мм, Фурнитура - ${hardwareKits.find((k: any) => k.id === i.hardwareKitId)?.name.replace('Комплект фурнитуры — ', '') || 'Базовый'})`
                                }
                          </div>
                        </div>
                            <div className="text-sm">
                              <span className="text-gray-600">{i.qty}×{fmtInt(i.unitPrice)}</span>
                              <span className="font-semibold text-black ml-3">{fmtInt(i.unitPrice * i.qty)} ₽</span>
                          </div>
                      </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Корзина пуста
                        </div>
                )}

                {/* Блок кнопок экспорта временно удален по запросу */}
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "admin" && (
        <div className="max-w-3xl mx_auto p-6 space-y-8">
          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">Регистрация / Вход</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="you@company.com"
                />
              </label>
              <label className="text-sm">
                Пароль
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="минимум 6 символов"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={reg}
                className="px-3 py-2 rounded-xl border disabled:opacity-50"
                disabled={authBusy}
              >
                Зарегистрировать
              </button>
              <button
                onClick={login}
                className="px-3 py-2 rounded-xl border disabled:opacity-50"
                disabled={authBusy}
              >
                Войти
              </button>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-xl border"
                disabled={!token}
              >
                Выйти
              </button>
              <div className="text-xs text-gray-500 truncate max-w-[50%]">
                Токен: {token ? token : "—"}
              </div>
            </div>
            {!API && (
              <p className="text-xs text-gray-500 mt-2">
                Для реальных запросов установите window.__API_URL__
              </p>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">Импорт прайса (XLSX/CSV)</h2>
            <form onSubmit={importPrice} className="space-y-3">
              <label className="text-sm block">
                Категория
                <select
                  className="w-full border rounded px-3 py-2"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="doors">doors</option>
                </select>
              </label>
              <input type="file" name="price" accept=".xlsx,.csv" className="block" />
              <label className="text-sm block">
                Mapping JSON (опционально)
                <textarea
                  value={mappingText}
                  onChange={(e) => setMappingText(e.target.value)}
                  className="w-full border rounded px-3 py-2 font-mono text-sm min-h-[160px]"
                />
              </label>
              <button
                className="px-4 py-2 rounded-xl bg-black text-white"
                type="submit"
                disabled={!token}
              >
                Импортировать
              </button>
              {!token && (
                <div className="text-xs text-red-600 mt-1">
                  Требуется вход: получите токен выше
                </div>
              )}
            </form>

            {importInfo && (
              <div className="mt-3 text-sm">
                {importInfo.ok && importInfo.status === 200 && (
                  <div className="rounded-lg border p-3 bg-green-50">
                    <div className="font-medium">✅ База загружена</div>
                    <pre className="bg-white border mt-2 p-2 rounded overflow-auto">
                      {JSON.stringify(importInfo.body, null, 2)}
                    </pre>
                  </div>
                )}
                {!importInfo.ok && importInfo.status === 409 && (
                  <div className="rounded-lg border p-3 bg-yellow-50">
                    <div className="font-medium">⚠️ Конфликты РРЦ</div>
                    <pre className="bg-white border mt-2 p-2 rounded overflow-auto">
                      {JSON.stringify(importInfo.body, null, 2)}
                    </pre>
                    {(importInfo.body?.report_csv ||
                      importInfo.body?.conflicts_report) && (
                      <a
                        className="underline"
                        href={
                          importInfo.body.report_csv ||
                          importInfo.body.conflicts_report
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть CSV-отчёт
                      </a>
                    )}
                  </div>
                )}
                {!importInfo.ok && importInfo.status !== 409 && (
                  <div className="rounded-lg border p-3 bg-red-50">
                    <div className="font-medium">❌ Ошибка импорта</div>
                    <pre className="bg-white border mt-2 p-2 rounded overflow-auto">
                      {JSON.stringify(importInfo.body, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">Загрузка фото (Doors)</h2>
            <form onSubmit={uploadMedia} className="space-y-3">
              <label className="text-sm block">
                Model
                <input
                  value={modelForPhoto}
                  onChange={(e) => setModelForPhoto(e.target.value)}
                  placeholder="например: PO Base 1/1"
                  className="w-full border rounded px-3 py-2"
                />
              </label>
              <input
                type="file"
                name="media"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="block"
              />
              <div className="text-xs text-gray-500">
                Имя файла: <code>encodeURIComponent(model).ext</code>; папка:{" "}
                <code>public/assets/doors/</code>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-black text-white"
                type="submit"
                disabled={!token}
              >
                Загрузить
              </button>
              {!token && (
                <div className="text-xs text-red-600 mt-1">
                  Требуется вход: получите токен выше
                </div>
              )}
            </form>

            {mediaInfo && (
              <div className="mt-3 text-sm">
                {mediaInfo.ok ? (
                  <div className="rounded-lg border p-3 bg-green-50">
                    <div className="font-medium">✅ Файл(ы) сохранены</div>
                    <pre className="bg-white border mt-2 p-2 rounded overflow-auto">
                      {JSON.stringify(mediaInfo.body, null, 2)}
                    </pre>
                    {mediaInfo.body?.files?.[0]?.url && (
                      <a
                        className="underline"
                        href={mediaInfo.body.files[0].url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть {mediaInfo.body.files[0].filename}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border p-3 bg-red-50">
                    <div className="font-medium">❌ Ошибка загрузки</div>
                    <pre className="bg-white border mt-2 p-2 rounded overflow-auto">
                      {JSON.stringify(mediaInfo.body, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </section>

          <pre className="bg-gray-50 rounded-xl p-3 text-xs whitespace-pre-wrap">
            {out}
          </pre>
        </div>
      )}

      {/* SSR smoke marker */}
      <div data-smoke="doors-active" hidden />

      {/* Client Selection Modal */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-black mb-4">Выберите клиента</h3>
            <p className="text-sm text-gray-600 mb-4">
              Для создания документа необходимо выбрать клиента
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Клиент</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 text-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Выберите клиента</option>
                  <option value="1">Иванов Иван Иванович</option>
                  <option value="2">Петрова Анна Сергеевна</option>
                  <option value="3">Сидоров Петр Александрович</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowClientModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (selectedClient) {
                      setShowClientModal(false);
                      // Здесь можно добавить логику для продолжения экспорта
                    }
                  }}
                  disabled={!selectedClient}
                  className="flex-1 px-4 py-2 bg-black text-white hover:bg-yellow-400 hover:text-black transition-all duration-200 text-sm font-medium disabled:opacity-50"
                >
                  Продолжить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора количества */}
      {showQuantityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-black mb-4">Выберите количество</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Количество дверей
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-lg font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border border-gray-300 rounded py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowQuantityModal(false);
                  setQuantity(1);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={addToCart}
                className="flex-1 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Добавить в корзину
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Менеджер корзины */}
      {showCartManager && (
        <CartManager
          cart={cart}
          setCart={setCart}
          originalPrices={originalPrices}
          setOriginalPrices={setOriginalPrices}
          cartHistory={cartHistory}
          setCartHistory={setCartHistory}
          hardwareKits={hardwareKits}
          handles={handles}
          cartManagerBasePrices={cartManagerBasePrices}
          showClientManager={showClientManager}
          setShowClientManager={setShowClientManager}
          generateDocument={generateDocument}
          selectedClient={selectedClient}
          selectedClientName={selectedClientName}
          setSelectedClient={setSelectedClient}
          setSelectedClientName={setSelectedClientName}
          userRole={userRole}
          onClose={() => setShowCartManager(false)}
        />
      )}

      {/* Менеджер заказчиков */}
      {showClientManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[96vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-black">Менеджер заказчиков</h2>
              <button
                onClick={() => setShowClientManager(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content: только поиск + кнопка "+" для создания */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">Поиск</h3>
                <button
                  onClick={() => setShowCreateClientForm(true)}
                  className="px-3 py-2 text-sm border border-black text-black hover:bg-black hover:text-white rounded transition-all duration-200"
                >
                  + Новый заказчик
                </button>
              </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                  placeholder="Поиск по ФИО, телефону, адресу, ID объекта..."
                  value={clientSearchInput}
                  onChange={(e) => setClientSearchInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {clientsLoading ? (
                    <div className="p-4 text-center text-gray-500">Загрузка клиентов...</div>
                      ) : clients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Клиенты не найдены</div>
                  ) : (
                    clients
                      .filter((c) => {
                        if (!clientSearch) return true;
                        const hay = `${c.lastName} ${c.firstName} ${c.middleName ?? ''} ${c.phone ?? ''} ${c.address ?? ''} ${(c as any).objectId ?? ''}`.toLowerCase();
                        return hay.includes(clientSearch.toLowerCase());
                      })
                      .map((client) => (
                          <div 
                            key={client.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${selectedClient === client.id ? 'bg-blue-50 border-blue-200' : ''}`}
                            onClick={() => {
                              setSelectedClient(client.id);
                              setSelectedClientName(`${client.firstName} ${client.lastName}`);
                            }}
                          >
                        <div className="grid items-center gap-3" style={{gridTemplateColumns: '5fr 3fr 7fr 120px'}}>
                          <div className="font-medium truncate">
                            {client.lastName} {client.firstName}{client.middleName ? ` ${client.middleName}` : ''}
                          </div>
                          <div className="text-sm text-gray-600 truncate">{formatPhone(client.phone as any)}</div>
                          <div className="text-sm text-gray-600 overflow-hidden" style={{display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>
                            {client.address || '—'}
                          </div>
                          <div className="text-sm text-gray-600 text-right" style={{minWidth:120, maxWidth:120, whiteSpace:'nowrap'}}>{(client as any).objectId || '—'}</div>
                        </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowClientManager(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (selectedClient) {
                      setShowClientManager(false);
                    } else {
                      alert('Пожалуйста, выберите клиента из списка');
                    }
                  }}
                  disabled={!selectedClient}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Выбрать клиента
                </button>
                  </div>
                </div>

            {/* Модалка создания клиента */}
            {showCreateClientForm && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-lg w-full max-w-4xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-black">Новый заказчик</h3>
                  <button
                    onClick={() => setShowCreateClientForm(false)}
                    className="px-3 py-2 text-sm border border-black text-black hover:bg-black hover:text-white rounded"
                  >
                    Закрыть
                  </button>
                </div>

                {/* Одна строка с полями разной ширины */}
                <div className="grid grid-cols-12 gap-3">
                      <input
                        type="text"
                    placeholder="Фамилия"
                        value={newClientData.lastName}
                        onChange={(e) => setNewClientData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="col-span-3 px-3 py-2 border border-gray-300 rounded"
                      />
                      <input
                        type="text"
                    placeholder="Имя"
                        value={newClientData.firstName}
                        onChange={(e) => setNewClientData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded"
                      />
                      <input
                        type="text"
                    placeholder="Отчество"
                        value={newClientData.middleName}
                        onChange={(e) => setNewClientData(prev => ({ ...prev, middleName: e.target.value }))}
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded"
                      />
                      <input
                        type="tel"
                    placeholder="Телефон"
                        value={newClientData.phone}
                        onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="ID объекта"
                    value={newClientData.objectId}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, objectId: e.target.value }))}
                    className="col-span-3 md:col-span-3 px-3 py-2 border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Адрес"
                        value={newClientData.address}
                        onChange={(e) => setNewClientData(prev => ({ ...prev, address: e.target.value }))}
                    className="col-span-12 px-3 py-2 border border-gray-300 rounded"
                      />
                    </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setShowCreateClientForm(false)}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
                  >
                    Отмена
                  </button>
                    <button
                      onClick={async () => {
                        if (!newClientData.firstName || !newClientData.lastName || !newClientData.phone) {
                        alert('Заполните ФИО и телефон');
                          return;
                        }
                          const client = await createClient(newClientData);
                          setSelectedClient(client.id);
                          setSelectedClientName(`${client.firstName} ${client.lastName}`);
                      setShowCreateClientForm(false);
                    }}
                    className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                    >
                      Создать клиента
                    </button>
                    </div>
                  </div>
                </div>
            )}
              </div>
        </div>
      )}

      {/* Модальное окно выбора ручек */}
      {showHandleModal && (
        <HandleSelectionModal
          handles={handles}
          selectedHandleId={sel.handle?.id}
          onSelect={(handleId: string) => {
            setSel((s) => ({ 
              ...s, 
              handle: handleId ? { id: handleId } : undefined
            }));
            setShowHandleModal(false);
          }}
          onClose={() => setShowHandleModal(false)}
        />
      )}
    </div>
  );
}

// ===================== Вспомогательные компоненты =====================

// Менеджер корзины
function CartManager({
  cart,
  setCart,
  originalPrices,
  setOriginalPrices,
  cartHistory,
  setCartHistory,
  hardwareKits,
  handles,
  cartManagerBasePrices,
  showClientManager,
  setShowClientManager,
  generateDocument,
  selectedClient,
  selectedClientName,
  setSelectedClient,
  setSelectedClientName,
  userRole,
  onClose
}: {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  originalPrices: Record<string, number>;
  setOriginalPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  cartHistory: Array<{timestamp: Date, changes: Record<string, any>, totalDelta: number}>;
  setCartHistory: React.Dispatch<React.SetStateAction<Array<{timestamp: Date, changes: Record<string, any>, totalDelta: number}>>>;
  hardwareKits: HardwareKit[];
  handles: Record<string, Handle[]>;
  cartManagerBasePrices: Record<string, number>;
  showClientManager: boolean;
  setShowClientManager: React.Dispatch<React.SetStateAction<boolean>>;
  generateDocument: (type: 'quote' | 'invoice' | 'order') => Promise<void>;
  selectedClient: string;
  selectedClientName: string;
  setSelectedClient: React.Dispatch<React.SetStateAction<string>>;
  setSelectedClientName: React.Dispatch<React.SetStateAction<string>>;
  userRole: string;
  onClose: () => void;
}) {
  // Состояние для модального окна выбора ручек при редактировании в корзине
  const [showHandleModalInCart, setShowHandleModalInCart] = useState(false);
  const [editingHandleItemId, setEditingHandleItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  
  // Вспомогательная функция для получения ручки по ID (оптимизация для избежания повторных поисков)
  const getHandleById = React.useCallback((handleId: string | undefined): Handle | undefined => {
    if (!handleId) return undefined;
    return Object.values(handles).flat().find((h: Handle) => h.id === handleId);
  }, [handles]);
  const [availableParams, setAvailableParams] = useState<any>(null);
  // ИСПРАВЛЕНИЕ #2: Сохраняем пересчитанную цену во время редактирования, чтобы избежать двойного пересчета
  const [editingItemPrice, setEditingItemPrice] = useState<number | null>(null);
  // ИСПРАВЛЕНИЕ #3: Сохраняем snapshot товара для отката изменений при отмене
  const [editingItemSnapshot, setEditingItemSnapshot] = useState<CartItem | null>(null);
  // Состояние для модального окна истории
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Простое отображение всех товаров корзины
  const filteredCart = cart;

  // Функция быстрого экспорта
  const generateDocumentFast = async (type: 'quote' | 'invoice' | 'order', format: 'pdf' | 'excel' | 'csv') => {
    if (!selectedClient) {
      alert('Выберите клиента');
      return;
    }

    console.log('🚀 Начинаем экспорт:', { type, format, clientId: selectedClient });
    console.log('📦 Данные корзины:', cart);

    try {
      const response = await fetch('/api/export/fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          format,
          clientId: selectedClient,
          items: cart,
          totalAmount: cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка экспорта');
      }

      // Получаем файл
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Получаем имя файла из заголовков
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${type}.${format}`;

      // Получаем информацию о созданном документе
      const documentId = response.headers.get('X-Document-Id');
      const documentType = response.headers.get('X-Document-Type');
      const documentNumber = response.headers.get('X-Document-Number');

      // Скачиваем файл
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Документ экспортирован: ${filename}`);
      if (documentId) {
        console.log(`📄 Создан документ в БД: ${documentType} #${documentId} (${documentNumber})`);
      }

    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте документа');
    }
  };

  // Функции редактирования
  const startEditingItem = async (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    console.log('🔍 Starting edit for item:', item);
    console.log('🔍 Item style:', JSON.stringify(item?.style));
    console.log('🔍 Item model:', JSON.stringify(item?.model));
    
    if (item && item.style && item.model) {
      setEditingItem(itemId);
      // ИСПРАВЛЕНИЕ #2: Сбрасываем сохраненную цену при начале редактирования
      setEditingItemPrice(null);
      // ИСПРАВЛЕНИЕ #3: Сохраняем snapshot товара для возможного отката
      setEditingItemSnapshot({ ...item });
      
      // Загружаем доступные параметры
      try {
        const response = await fetch('/api/available-params', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            style: item.style,
            model: item.model,
            color: item.color
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📥 Available params response:', data);
          setAvailableParams(data.params);
        } else {
          console.error('Error loading available parameters:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading available parameters:', error);
      }
    }
  };

  const updateCartItem = async (itemId: string, changes: Partial<CartItem>) => {
    console.log('🔄 updateCartItem called:', { itemId, changes });
    
    // Получаем текущий элемент из корзины
    const currentItem = cart.find(i => i.id === itemId);
    if (!currentItem) {
      console.log('❌ Item not found in cart:', itemId);
      return;
    }

    // Проверяем, действительно ли изменились параметры
    const hasRealChanges = Object.keys(changes).some(key => {
      const currentValue = currentItem[key as keyof CartItem];
      const newValue = changes[key as keyof CartItem];
      return currentValue !== newValue;
    });

    console.log('🔍 Change detection:', {
      changes,
      currentItem: {
        finish: currentItem.finish,
        color: currentItem.color,
        width: currentItem.width,
        height: currentItem.height,
        hardwareKitId: currentItem.hardwareKitId,
        handleId: currentItem.handleId
      },
      hasRealChanges
    });

    // Если нет реальных изменений - ничего не делаем
    if (!hasRealChanges) {
      console.log('⏭️ No real changes detected, skipping update');
      return;
    }

    // Создаем обновленный элемент с новыми параметрами
    const updatedItem = { ...currentItem, ...changes };
    console.log('📝 Updated item:', updatedItem);

    // Проверяем, изменились ли параметры, влияющие на цену
    const priceAffectingChanges: (keyof CartItem)[] = ['finish', 'color', 'width', 'height', 'hardwareKitId', 'handleId'];
    const hasPriceAffectingChanges = priceAffectingChanges.some(key => 
      changes[key] !== undefined && currentItem[key] !== changes[key]
    );

    if (!hasPriceAffectingChanges) {
      console.log('⏭️ Нет изменений, влияющих на цену, обновляем только параметры');
      setCart(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...changes } : item
      ));
      return;
    }

    // Для ручек получаем цену и актуальное название из каталога
    if (updatedItem.handleId) {
      const handle = Object.values(handles).flat().find((h: Handle) => h.id === updatedItem.handleId);
      const newPrice = handle ? handle.price : updatedItem.unitPrice;
      const newHandleName = handle ? handle.name : undefined;
      console.log('🔧 Handle price update:', { handleId: updatedItem.handleId, newPrice, newHandleName });
      // ИСПРАВЛЕНИЕ: Обновляем также handleName из актуального каталога
      // ИСПРАВЛЕНИЕ #2: Сохраняем цену ручки для использования при подтверждении
      if (itemId === editingItem) {
        setEditingItemPrice(newPrice);
      }
      
      setCart(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          ...changes, 
          unitPrice: newPrice,
          handleName: newHandleName // Обновляем название из актуального каталога
        } : item
      ));
      return;
    }

    // Для дверей используем унифицированный сервис расчета цены
    console.log('🚪 Door price calculation using unified service');
    
    const result = await priceRecalculationService.recalculateItemPrice(updatedItem, {
      validateCombination: true,
      useCache: true,
      timeout: 10000
    });

    if (result.success && result.price !== undefined) {
      console.log('✅ Price calculated successfully:', result.price);
      // ИСПРАВЛЕНИЕ #2: Сохраняем пересчитанную цену для использования при подтверждении
      if (itemId === editingItem) {
        setEditingItemPrice(result.price);
      }
      setCart(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          ...changes, 
          unitPrice: result.price!,
          sku_1c: result.sku_1c || item.sku_1c
        } : item
      ));
    } else {
      console.log('❌ Price calculation failed:', result.error);
      // Показываем пользователю понятное сообщение об ошибке
      if (result.error) {
        alert(`Ошибка расчета цены: ${result.error}`);
      }
      // В случае ошибки обновляем корзину без изменения цены
      setCart(prev => prev.map(item => 
        item.id === itemId ? { ...item, ...changes } : item
      ));
    }
  };

  const confirmCartChanges = async () => {
    if (!editingItem) return;

    const currentItem = cart.find(i => i.id === editingItem);
    if (!currentItem) return;

    // Валидация обязательных полей (только для дверей)
    if (!currentItem.handleId && (!currentItem.finish || !currentItem.color || !currentItem.width || !currentItem.height)) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      let newPrice: number;
      
      // ИСПРАВЛЕНИЕ #2: Используем уже рассчитанную цену, если она есть, чтобы избежать двойного пересчета
      if (editingItemPrice !== null) {
        console.log('💾 Используем уже рассчитанную цену из updateCartItem:', editingItemPrice);
        newPrice = editingItemPrice;
      } else {
        // Пересчитываем только если цена еще не была рассчитана
        if (currentItem.handleId) {
          // Для ручек получаем цену из каталога
          const handle = Object.values(handles).flat().find((h: Handle) => h.id === currentItem.handleId);
          newPrice = handle ? handle.price : currentItem.unitPrice;
        } else {
          // Для дверей используем унифицированный сервис расчета цены
          console.log('🚪 Door price calculation using unified service in confirmCartChanges (fallback)');
          
          const result = await priceRecalculationService.recalculateItemPrice(currentItem, {
            validateCombination: true,
            useCache: true,
            timeout: 10000
          });

          if (!result.success || !result.price) {
            const errorMessage = result.error || 'Не удалось рассчитать цену';
            alert(`Ошибка расчета цены: ${errorMessage}`);
            setEditingItem(null);
            setEditingItemPrice(null); // Сбрасываем сохраненную цену
            return;
          }

          newPrice = result.price;
        }
      }

      // Обновляем корзину
      // ИСПРАВЛЕНИЕ: Для ручек также обновляем handleName из актуального каталога
      setCart(prev => prev.map(item => {
        if (item.id === editingItem) {
          if (currentItem.handleId) {
            const handle = Object.values(handles).flat().find((h: Handle) => h.id === currentItem.handleId);
            return { ...item, unitPrice: newPrice, handleName: handle?.name };
          }
          return { ...item, unitPrice: newPrice };
        }
        return item;
      }));

      // Сохраняем в историю
      // ИСПРАВЛЕНИЕ #1: Используем cartManagerBasePrices вместо originalPrices для единообразия
      // Это обеспечит совпадение дельты в UI и в истории
      const basePriceForDelta = cartManagerBasePrices[editingItem] || currentItem.unitPrice || 0;
      const delta = newPrice - basePriceForDelta;
      
      // Сохраняем полное состояние товара для возможности отката
      setCartHistory(prev => [...prev, {
        timestamp: new Date(),
        changes: { 
          [editingItem]: { 
            item: { ...currentItem, unitPrice: newPrice }, // Полное состояние товара
            oldPrice: currentItem.unitPrice,
            newPrice: newPrice
          } 
        },
        totalDelta: delta
      }]);

      // ИСПРАВЛЕНИЕ #1: Обновляем cartManagerBasePrices после подтверждения
      // Теперь следующая дельта будет считаться от новой базовой цены
      setCartManagerBasePrices(prev => ({
        ...prev,
        [editingItem]: newPrice
      }));

      console.log('✅ Cart changes confirmed successfully', {
        itemId: editingItem,
        basePrice: basePriceForDelta,
        newPrice,
        delta
      });

    } catch (error) {
      console.error('❌ Error confirming cart changes:', error);
      alert('Произошла ошибка при обновлении товара');
    }

    // ИСПРАВЛЕНИЕ #2: Сбрасываем сохраненную цену после подтверждения
    // ИСПРАВЛЕНИЕ #3: Сбрасываем snapshot после подтверждения
    setEditingItem(null);
    setEditingItemPrice(null);
    setEditingItemSnapshot(null);
  };

  const cancelCartChanges = () => {
    // ИСПРАВЛЕНИЕ #3: Восстанавливаем товар из snapshot при отмене
    if (editingItem && editingItemSnapshot) {
      setCart(prev => prev.map(item => 
        item.id === editingItem ? editingItemSnapshot : item
      ));
      console.log('↩️ Изменения отменены, товар восстановлен из snapshot');
    }
    // ИСПРАВЛЕНИЕ #2: Сбрасываем сохраненную цену при отмене
    setEditingItem(null);
    setEditingItemPrice(null);
    setEditingItemSnapshot(null);
  };

  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const getItemDelta = (itemId: string) => {
    const basePrice = cartManagerBasePrices[itemId] || 0;
    const currentItem = cart.find(i => i.id === itemId);
    const currentPrice = currentItem?.unitPrice || 0;
    return currentPrice - basePrice;
  };

  const getTotalDelta = () => {
    return cart.reduce((total, item) => {
      return total + getItemDelta(item.id);
    }, 0);
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

  // Функция для отката корзины к состоянию до указанной записи истории
  const rollbackToHistory = (historyIndex: number) => {
    if (historyIndex < 0 || historyIndex >= cartHistory.length) return;
    
    // Находим все записи истории до указанного индекса (включительно)
    const historyToKeep = cartHistory.slice(0, historyIndex + 1);
    
    // Применяем все изменения до этой точки
    // Для правильного отката нужно восстановить состояние каждого товара
    // из последней записи истории, где он был изменен
    const itemStates: Record<string, CartItem> = {};
    
    // Собираем состояние всех товаров из истории
    historyToKeep.forEach(entry => {
      Object.entries(entry.changes).forEach(([itemId, change]: [string, any]) => {
        if (change.item) {
          itemStates[itemId] = change.item;
        }
      });
    });
    
    // Применяем откат: обновляем товары в корзине
    setCart(prev => prev.map(item => {
      if (itemStates[item.id]) {
        return itemStates[item.id];
      }
      return item;
    }));
    
    // Обновляем базовые цены для правильного расчета дельты
    setCartManagerBasePrices(prev => {
      const newBasePrices = { ...prev };
      Object.entries(itemStates).forEach(([itemId, item]) => {
        newBasePrices[itemId] = item.unitPrice;
      });
      return newBasePrices;
    });
    
    // Удаляем записи истории после указанного индекса
    setCartHistory(historyToKeep);
    
    console.log('↩️ Откат корзины к записи истории:', historyIndex);
  };

  // Функция для отката к состоянию до начала редактирования (полный откат всех изменений)
  const rollbackAllHistory = () => {
    if (cartHistory.length === 0) return;
    
    // Находим исходное состояние каждого товара (до первого изменения)
    const originalStates: Record<string, CartItem> = {};
    
    // Проходим по истории в обратном порядке, чтобы найти исходное состояние
    cartHistory.forEach((entry, index) => {
      Object.entries(entry.changes).forEach(([itemId, change]: [string, any]) => {
        if (change.oldPrice !== undefined && !originalStates[itemId]) {
          // Ищем оригинальный товар в корзине или используем данные из истории
          const originalItem = cart.find(i => i.id === itemId);
          if (originalItem) {
            originalStates[itemId] = { ...originalItem, unitPrice: change.oldPrice };
          }
        }
      });
    });
    
    // Восстанавливаем исходные цены
    setCart(prev => prev.map(item => {
      if (originalStates[item.id]) {
        return originalStates[item.id];
      }
      return item;
    }));
    
    // Обновляем базовые цены
    setCartManagerBasePrices(prev => {
      const newBasePrices = { ...prev };
      Object.entries(originalStates).forEach(([itemId, item]) => {
        newBasePrices[itemId] = item.unitPrice;
      });
      return newBasePrices;
    });
    
    // Очищаем историю
    setCartHistory([]);
    
    console.log('↩️ Полный откат всех изменений корзины');
  };

  // Проверки разрешений по ролям
  const canCreateQuote = userRole === 'admin' || userRole === 'complectator';
  const canCreateInvoice = userRole === 'admin' || userRole === 'complectator';
  const canCreateOrder = userRole === 'admin' || userRole === 'executor';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-black">Корзина</h2>
          
          {/* Кнопки экспорта документов */}
          <div className="flex items-center space-x-2">
            {userRole !== 'guest' && (
              <button
                onClick={() => setShowClientManager(true)}
                className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-400 text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                <span>👤</span>
                <span>{selectedClientName || 'Заказчик'}</span>
              </button>
            )}
            {canCreateQuote && (
            <button
                onClick={() => generateDocumentFast('quote', 'pdf')}
              className="flex items-center space-x-1 px-3 py-1 text-sm border border-blue-500 text-blue-600 hover:bg-blue-50 transition-all duration-200"
            >
              <span>📄</span>
              <span>КП</span>
            </button>
            )}
            {canCreateInvoice && (
            <button
                onClick={() => generateDocumentFast('invoice', 'pdf')}
              className="flex items-center space-x-1 px-3 py-1 text-sm border border-green-500 text-green-600 hover:bg-green-50 transition-all duration-200"
            >
                <span>📄</span>
              <span>Счет</span>
            </button>
            )}
            {canCreateOrder && (
            <button
                onClick={() => generateDocumentFast('order', 'excel')}
              className="flex items-center space-x-1 px-3 py-1 text-sm border border-orange-500 text-orange-600 hover:bg-orange-50 transition-all duration-200"
            >
                <span>📊</span>
              <span>Заказ</span>
            </button>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>


        {/* Список товаров */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {filteredCart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {cart.length === 0 ? 'Корзина пуста' : 'Товары не найдены'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCart.map((item) => {
                const delta = getItemDelta(item.id);
                const isEditing = editingItem === item.id;
                
                if (item.handleId) {
                  // ИСПРАВЛЕНИЕ: Всегда используем актуальное имя из каталога, а не item.handleName
                  const handle = getHandleById(item.handleId);
                  const currentHandleName = handle?.name || item.handleName || "Ручка";
                  return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {/* ИСПРАВЛЕНИЕ: Отображаем фото ручки при редактировании */}
                        {isEditing && handle && handle.photos && handle.photos.length > 0 && (
                          <div className="mb-2 flex items-center space-x-2">
                            {handle.photos.slice(0, 3).map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo && photo.startsWith('/uploads') ? `/api${photo}` : photo ? `/api/uploads${photo}` : ''}
                                alt={`${currentHandleName} фото ${idx + 1}`}
                                className="w-12 h-12 object-cover rounded border border-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <div className="font-medium text-black text-sm truncate">
                          {currentHandleName ? `Ручка ${currentHandleName}` : "Ручка"}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 ml-6">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => updateCartItem(item.id, { qty: Math.max(1, item.qty - 1) })}
                            className="w-4 h-4 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="min-w-[12px] text-center text-xs">{item.qty}</span>
                          <button
                            onClick={() => updateCartItem(item.id, { qty: item.qty + 1 })}
                            className="w-4 h-4 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-black text-sm">
                            {fmtInt(item.unitPrice * item.qty)} ₽
                          </div>
                          {delta !== 0 && (
                            <div className={`text-xs ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {delta > 0 ? '+' : ''}{fmtInt(delta)} ₽
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                          {!isEditing && (
                            <button
                              onClick={() => startEditingItem(item.id)}
                              className="w-5 h-5 bg-black text-white rounded hover:bg-gray-800 flex items-center justify-center text-xs"
                              title="Редактировать"
                            >
                              ✏️
                            </button>
                          )}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-5 h-5 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center justify-center text-xs"
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                          {/* Компактная строка с кнопками */}
                          <div className="flex items-center space-x-2 mb-4">
                            {/* Ручка - кнопка для открытия модального окна */}
                            <div className="flex-shrink-0">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Ручка</label>
                              <button
                                onClick={() => {
                                  if (item.id) {
                                    setEditingHandleItemId(item.id);
                                    setShowHandleModalInCart(true);
                                  }
                                }}
                                className="w-full text-xs border border-gray-300 rounded px-3 py-2 bg-white hover:bg-gray-50 text-left flex items-center justify-between min-w-[200px]"
                              >
                                <span>
                                  {handle && handle.name ? `Ручка ${handle.name}` : 'Выбрать ручку'}
                                </span>
                                <span className="text-gray-400 ml-2">→</span>
                              </button>
                              {handle && handle.price !== undefined && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Цена: {fmtInt(handle.price)} ₽
                                </div>
                              )}
                            </div>

                            {/* Кнопки */}
                            <div className="flex-shrink-0">
                              <label className="block text-xs font-medium text-gray-700 mb-1">&nbsp;</label>
                              <div className="flex space-x-1">
                                <button
                                  onClick={confirmCartChanges}
                                  className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                                >
                                  Применить
                                </button>
                                <button
                                  onClick={cancelCartChanges}
                                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                  Отменить
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-black text-sm truncate">
                          {item.type === 'handle' 
                            ? (() => {
                              const displayHandle = getHandleById(item.handleId);
                              return `Ручка ${displayHandle?.name || item.handleName || 'Неизвестная ручка'}`;
                            })()
                            : `Дверь DomeoDoors ${item.model?.replace(/DomeoDoors_/g, '').replace(/_/g, ' ') || 'Неизвестная модель'}`
                          }
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {item.type === 'handle' 
                            ? `Ручка для двери`
                            : `${item.finish}, ${item.color}, ${item.width} × ${item.height} мм, Фурнитура: ${hardwareKits.find((k: any) => k.id === item.hardwareKitId)?.name.replace('Комплект фурнитуры — ', '') || 'Базовый'}`
                          }
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 ml-6">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => updateCartItem(item.id, { qty: Math.max(1, item.qty - 1) })}
                            className="w-4 h-4 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="min-w-[12px] text-center text-xs">{item.qty}</span>
                          <button
                            onClick={() => updateCartItem(item.id, { qty: item.qty + 1 })}
                            className="w-4 h-4 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-black text-sm">
                            {fmtInt(item.unitPrice * item.qty)} ₽
                          </div>
                          {delta !== 0 && (
                            <div className={`text-xs ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {delta > 0 ? '+' : ''}{fmtInt(delta)} ₽
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        {!isEditing && (
                          <button
                            onClick={() => startEditingItem(item.id)}
                            className="w-5 h-5 bg-black text-white rounded hover:bg-gray-800 flex items-center justify-center text-xs"
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-5 h-5 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center justify-center text-xs"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {isEditing && availableParams && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                        {/* Компактная строка с селектами */}
                        <div className="flex items-center space-x-2 mb-4">
                          {/* Покрытие */}
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Покрытие</label>
                            <select
                              value={item.finish || ''}
                              onChange={(e) => updateCartItem(item.id, { finish: e.target.value })}
                              className="w-24 text-xs border border-gray-300 rounded px-1 py-1"
                            >
                              <option value="">Выберите</option>
                              {availableParams.finishes?.map((finish: string) => (
                                <option key={finish} value={finish}>{finish}</option>
                              ))}
                            </select>
                          </div>

                          {/* Цвет */}
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Цвет</label>
                            <select
                              value={item.color || ''}
                              onChange={(e) => updateCartItem(item.id, { color: e.target.value })}
                              className="w-24 text-xs border border-gray-300 rounded px-1 py-1"
                            >
                              <option value="">Выберите</option>
                              {availableParams.colors?.map((color: string) => (
                                <option key={color} value={color}>{color}</option>
                              ))}
                            </select>
                          </div>

                          {/* Ширина */}
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Ширина</label>
                            <select
                              value={item.width || ''}
                              onChange={(e) => updateCartItem(item.id, { width: Number(e.target.value) })}
                              className="w-16 text-xs border border-gray-300 rounded px-1 py-1"
                            >
                              <option value="">Выберите</option>
                              {availableParams.widths?.map((width: number) => (
                                <option key={width} value={width}>{width}</option>
                              ))}
                            </select>
                          </div>

                          {/* Высота */}
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Высота</label>
                            <select
                              value={item.height || ''}
                              onChange={(e) => updateCartItem(item.id, { height: Number(e.target.value) })}
                              className="w-16 text-xs border border-gray-300 rounded px-1 py-1"
                            >
                              <option value="">Выберите</option>
                              {availableParams.heights?.map((height: number) => (
                                <option key={height} value={height}>{height}</option>
                              ))}
                            </select>
                          </div>

                          {/* Комплект фурнитуры */}
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Фурнитура</label>
                            <select
                              value={item.hardwareKitId || ''}
                              onChange={(e) => updateCartItem(item.id, { hardwareKitId: e.target.value })}
                              className="w-24 text-xs border border-gray-300 rounded px-1 py-1"
                            >
                              <option value="">Выберите</option>
                              {availableParams.hardwareKits?.map((kit: {id: string, name: string}) => (
                                <option key={kit.id} value={kit.id}>{kit.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Количество */}
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Количество</label>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => updateCartItem(item.id, { qty: Math.max(1, item.qty - 1) })}
                                className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <span className="min-w-[16px] text-center text-xs">{item.qty}</span>
                              <button
                                onClick={() => updateCartItem(item.id, { qty: item.qty + 1 })}
                                className="w-5 h-5 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {/* Кнопки */}
                          <div className="flex-shrink-0">
                            <label className="block text-xs font-medium text-gray-700 mb-1">&nbsp;</label>
                            <div className="flex space-x-1">
                              <button
                                onClick={confirmCartChanges}
                                className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                              >
                                Применить
                              </button>
                              <button
                                onClick={cancelCartChanges}
                                className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                Отменить
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-black">
              Итого: {fmtInt(totalPrice)} ₽
              {getTotalDelta() !== 0 && (
                <span className={`ml-2 text-sm ${getTotalDelta() > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({getTotalDelta() > 0 ? '+' : ''}{fmtInt(getTotalDelta())} ₽)
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              {cartHistory.length > 0 && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  История ({cartHistory.length})
                </button>
              )}
              <button
                onClick={() => setCart([])}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Очистить корзину
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно истории изменений */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-black">История изменений корзины</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Список истории */}
            <div className="flex-1 overflow-y-auto p-6">
              {cartHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  История изменений пуста
                </div>
              ) : (
                <div className="space-y-3">
                  {cartHistory.map((entry, index) => {
                    const itemIds = Object.keys(entry.changes);
                    return (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {entry.timestamp.toLocaleString('ru-RU', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              Изменено товаров: {itemIds.length}
                            </div>
                            <div className="space-y-1">
                              {itemIds.map(itemId => {
                                const change = entry.changes[itemId];
                                const item = cart.find(i => i.id === itemId) || change?.item;
                                return (
                                  <div key={itemId} className="text-xs text-gray-700">
                                    <span className="font-medium">
                                      {item?.type === 'handle' 
                                        ? (() => {
                                            const displayHandle = Object.values(handles).flat().find((h: Handle) => h.id === item?.handleId);
                                            return `Ручка ${displayHandle?.name || item?.handleName || itemId}`;
                                          })()
                                        : `Дверь ${item?.model?.replace(/DomeoDoors_/g, '').replace(/_/g, ' ') || itemId}`}
                                    </span>
                                    {' - Цена: '}
                                    {change?.oldPrice && (
                                      <>
                                        <span className="line-through text-gray-400">
                                          {fmtInt(change.oldPrice)}₽
                                        </span>
                                        {' → '}
                                      </>
                                    )}
                                    <span className="font-medium text-green-600">
                                      {fmtInt(change?.newPrice || change?.item?.unitPrice || 0)}₽
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2 ml-4">
                            <div className={`text-sm font-semibold ${entry.totalDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.totalDelta >= 0 ? '+' : ''}{fmtInt(entry.totalDelta)} ₽
                            </div>
                            <button
                              onClick={() => {
                                rollbackToHistory(index);
                                setShowHistoryModal(false);
                              }}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                              title="Откатить к этому состоянию"
                            >
                              Откатить
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Всего записей: {cartHistory.length}
              </div>
              <div className="flex space-x-3">
                {cartHistory.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Вы уверены, что хотите откатить все изменения?')) {
                        rollbackAllHistory();
                        setShowHistoryModal(false);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Откатить все изменения
                  </button>
                )}
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно выбора ручек для редактирования в корзине */}
      {showHandleModalInCart && editingHandleItemId && (() => {
        const editingItem = cart.find(i => i.id === editingHandleItemId);
        if (!editingItem) {
          // Если товар не найден, закрываем модальное окно
          setShowHandleModalInCart(false);
          setEditingHandleItemId(null);
          return null;
        }
        return (
          <HandleSelectionModal
            handles={handles}
            selectedHandleId={editingItem.handleId}
            onSelect={(handleId: string) => {
              // Обновляем ручку в товаре корзины
              if (editingHandleItemId) {
                updateCartItem(editingHandleItemId, { handleId });
              }
              setShowHandleModalInCart(false);
              setEditingHandleItemId(null);
            }}
            onClose={() => {
              setShowHandleModalInCart(false);
              setEditingHandleItemId(null);
            }}
          />
        );
      })()}
    </div>
  );
}

// Компонент CartItemEditor удален - редактирование теперь инлайн в CartManager

function DoorCard({
  item,
  selected,
  onSelect,
}: {
  item: { model: string; modelKey?: string; style?: string; photo?: string | null; photos?: { cover: string | null; gallery: string[] }; hasGallery?: boolean };
  selected: boolean;
  onSelect: () => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Используем фото напрямую из данных модели
    console.log('🔍 DoorCard useEffect, item:', {
      model: item.model,
      modelKey: item.modelKey,
      photo: item.photo,
      hasPhoto: !!item.photo
    });
    
    if (item.photo && typeof item.photo === 'string') {
      console.log('📷 item.photo:', item.photo);
      console.log('📷 startsWith("/uploads"):', item.photo.startsWith('/uploads'));
      
      // Если фото начинается с /uploads/, используем как есть
      // Если начинается с products/ или uploads/, добавляем /api
      let imageUrl: string;
      if (item.photo.startsWith('/uploads/')) {
        imageUrl = `/api${item.photo}`;
      } else if (item.photo.startsWith('/uploads')) {
        // Корректируем: /uploadsproducts... -> /uploads/products...
        imageUrl = `/api/uploads/${item.photo.substring(8)}`; // убираем первые 8 символов '/uploads'
      } else if (item.photo.startsWith('products/')) {
        imageUrl = `/api/uploads/${item.photo}`;
      } else if (item.photo.startsWith('uploads/')) {
        imageUrl = `/api/${item.photo}`;
      } else {
        imageUrl = `/api/uploads/${item.photo}`;
      }
      
      console.log('📷 imageUrl:', imageUrl);
      setImageSrc(imageUrl);
      setIsLoading(false);
    } else if (item.modelKey) {
      // Fallback: загружаем фото через старый API используя modelKey
      const loadPhoto = async () => {
        try {
          setIsLoading(true);
          console.log('🔄 Загружаем фото для карточки модели:', item.modelKey);

          const response = await fetch(`/api/catalog/doors/photos?model=${encodeURIComponent(item.modelKey || '')}`);

          if (response.ok) {
            const data = await response.json();
            if (data.photos && data.photos.length > 0) {
              const photoPath = data.photos[0];
              // Обрабатываем разные форматы путей
              let imageUrl: string;
              if (photoPath.startsWith('/uploads/')) {
                imageUrl = `/api${photoPath}`;
              } else if (photoPath.startsWith('/uploads')) {
                imageUrl = `/api/uploads/${photoPath.substring(8)}`;
              } else if (photoPath.startsWith('products/')) {
                imageUrl = `/api/uploads/${photoPath}`;
              } else if (photoPath.startsWith('uploads/')) {
                imageUrl = `/api/${photoPath}`;
              } else {
                imageUrl = `/api/uploads/${photoPath}`;
              }
              setImageSrc(imageUrl);
            } else {
              setImageSrc(null);
            }
          } else {
            setImageSrc(null);
          }
        } catch (error) {
          console.error('❌ Ошибка загрузки фото для карточки:', error);
          setImageSrc(null);
        } finally {
          setIsLoading(false);
        }
      };

      loadPhoto();
    } else {
      // Если фото нет, показываем placeholder
      setImageSrc(null);
      setIsLoading(false);
    }
  }, [item.model, item.modelKey, item.photo]);

  return (
    <div className="flex flex-col">
    <button
      onClick={onSelect}
      aria-label={`Выбрать модель ${formatModelNameForCard(item.model)}`}
      className={[
          "group w-full text-left bg-white overflow-hidden",
        "hover:shadow-md transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ring-offset-2",
          selected ? "shadow-md" : "",
      ].join(" ")}
    >
        {/* Фото полностью заполняет карточку с правильным соотношением сторон для дверей */}
        <div className="aspect-[16/33] w-full bg-gray-50 relative group overflow-hidden">
          {isLoading ? (
            <div className="absolute inset-0 animate-pulse bg-gray-200" />
          ) : imageSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={formatModelNameForCard(item.model)}
                className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                onLoad={() => console.log('✅ Изображение загружено для', item.model, ':', imageSrc)}
                onError={(e) => {
                  console.error('❌ ОШИБКА ЗАГРУЗКИ изображения:', imageSrc);
                  console.error('❌ item.photo:', item.photo);
                  console.error('❌ Тип imageSrc:', typeof imageSrc);
                  console.error('❌ item:', item);
                  setImageSrc(null);
                }}
              />
              {/* Индикатор галереи */}
              {item.hasGallery && (
                <div className="absolute top-2 right-2 bg-white/90 text-gray-700 text-xs px-2 py-1 rounded-full font-medium shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  +{item.photos?.gallery.length || 0}
                </div>
              )}
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-sm">Нет фото</div>
                <div className="text-[14px] text-center whitespace-nowrap px-2" title={formatModelNameForCard(item.model)}>
                  {formatModelNameForCard(item.model)}
                </div>
              </div>
            </div>
          )}
        </div>
    </button>
      {/* Название модели под карточкой */}
      <div className="mt-2 flex justify-center">
        <div className="text-[14px] font-medium text-gray-900 text-center whitespace-nowrap px-2" title={formatModelNameForCard(item.model)}>
          {formatModelNameForCard(item.model)}
        </div>
      </div>
    </div>
  );
}

function StickyPreview({ item }: { item: { model: string; modelKey?: string; sku_1c?: any; photo?: string | null } | null }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!item?.model) {
      setImageSrc(null);
      setIsLoading(false);
      return;
    }

    // Если фото уже предзагружено в item.photo, используем его мгновенно
    if (item.photo && typeof item.photo === 'string') {
      // Обрабатываем разные форматы путей
      let imageUrl: string;
      if (item.photo.startsWith('/uploads/')) {
        imageUrl = `/api${item.photo}`;
      } else if (item.photo.startsWith('/uploads')) {
        // Корректируем: /uploadsproducts... -> /uploads/products...
        imageUrl = `/api/uploads/${item.photo.substring(8)}`;
      } else if (item.photo.startsWith('products/')) {
        imageUrl = `/api/uploads/${item.photo}`;
      } else if (item.photo.startsWith('uploads/')) {
        imageUrl = `/api/${item.photo}`;
      } else {
        imageUrl = `/api/uploads/${item.photo}`;
      }
      
      setImageSrc(imageUrl);
      setIsLoading(false);
      return;
    }

    // Fallback: загружаем фото через старый API (для совместимости)
    const loadPhoto = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Загружаем фото для превью:', item.modelKey || item.model);

        const response = await fetch(`/api/catalog/doors/photos?model=${encodeURIComponent(item.modelKey || item.model)}`);

          if (response.ok) {
            const data = await response.json();
            if (data.photos && data.photos.length > 0) {
              const photoPath = data.photos[0];
              // Обрабатываем разные форматы путей
              let imageUrl: string;
              if (photoPath.startsWith('/uploads/')) {
                imageUrl = `/api${photoPath}`;
              } else if (photoPath.startsWith('/uploads')) {
                imageUrl = `/api/uploads/${photoPath.substring(8)}`;
              } else if (photoPath.startsWith('products/')) {
                imageUrl = `/api/uploads/${photoPath}`;
              } else if (photoPath.startsWith('uploads/')) {
                imageUrl = `/api/${photoPath}`;
              } else {
                imageUrl = `/api/uploads/${photoPath}`;
              }
              setImageSrc(imageUrl);
            } else {
              setImageSrc(null);
            }
          } else {
            setImageSrc(null);
          }
      } catch (error) {
        console.error('❌ Ошибка загрузки фото для превью:', error);
        setImageSrc(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhoto();
  }, [item?.model, item?.modelKey, item?.photo]);

  if (!item) return null;
  return (
    <aside>
      <div className="mb-4 text-xl font-semibold text-center">{formatModelNameForPreview(item.model)}</div>
      <div className="aspect-[1/2] w-full overflow-hidden rounded-xl bg-gray-50">
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-gray-200" />
        ) : imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={formatModelNameForCard(item.model)}
            className="h-full w-full object-contain"
            onError={() => {
              console.log('❌ Ошибка загрузки изображения для превью:', imageSrc);
              setImageSrc(null);
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-sm">Нет фото</div>
              <div className="text-xs">{formatModelNameForCard(item.model)}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allowEmpty = false,
  disabled = false,
  isLoading = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowEmpty?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  // Стабилизируем опции - показываем текущие даже если массив пустой
  const stableOptions = options.length > 0 ? options : (value ? [value] : []);
  
  return (
    <label className="text-sm space-y-1">
      <div className={`text-gray-600 ${disabled ? 'opacity-50' : ''}`}>
        {label}
        {isLoading && <span className="ml-2 text-xs text-blue-600">⏳</span>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        disabled={disabled || isLoading}
        className={`w-full border border-black/20 px-3 py-2 text-black ${disabled || isLoading ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      >
        {allowEmpty && <option value="">—</option>}
        {stableOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function HardwareSelect({
  label,
  value,
  onChange,
  options,
  allowEmpty = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; name: string; price?: number; showroom?: boolean; description?: string }[];
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const [showDescription, setShowDescription] = useState<string | null>(null);
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="text-sm space-y-1">
      <div className={`text-gray-600 ${disabled ? 'opacity-50' : ''}`}>{label}</div>
      
      {/* Селект и цена в одной строке */}
      <div className="flex items-center gap-3">
        <select
          value={value}
          onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
          disabled={disabled}
          className={`flex-1 border border-black/20 px-3 py-2 text-black ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
        >
          {allowEmpty && <option value="">—</option>}
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name.replace('Комплект фурнитуры — ', '')}
            </option>
          ))}
        </select>
        
        {selectedOption && (
          <div className="flex items-center gap-2">
            {selectedOption.description && (
              <button
                type="button"
                onClick={() => setShowDescription(showDescription === selectedOption.id ? null : selectedOption.id)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Показать описание"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <div className="text-sm font-medium text-gray-900 min-w-[80px] text-right">
              {selectedOption.price ? `${fmtInt(selectedOption.price)} ₽` : ''}
            </div>
          </div>
        )}
      </div>
      
      {/* Описание комплекта */}
      {showDescription && selectedOption && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
          <div className="font-medium mb-1">Описание комплекта:</div>
          <div>{selectedOption.description}</div>
        </div>
      )}
    </div>
  );
}

function HandleSelect({
  label,
  value,
  onChange,
  handles,
  allowEmpty = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  handles: Record<string, Handle[]>;
  allowEmpty?: boolean;
  disabled?: boolean;
}) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const selectedHandle = Object.values(handles).flat().find(h => h.id === value);

  // Устанавливаем группу "Базовый" по умолчанию при загрузке
  useEffect(() => {
    if (handles['Базовый'] && handles['Базовый'].length > 0 && !selectedGroup) {
      setSelectedGroup('Базовый');
    }
  }, [handles, selectedGroup]);

  const handleGroupSelect = (groupName: string) => {
    setSelectedGroup(groupName);
    // Сбрасываем выбор ручки при смене группы
    onChange('');
  };

  const handleHandleSelect = (handleId: string) => {
    onChange(handleId);
  };

  const resetSelection = () => {
    onChange('');
    setSelectedGroup(null);
  };

  // Получаем все ручки для выбранной группы
  const currentGroupHandles = selectedGroup ? handles[selectedGroup] || [] : [];
  const displayPrice = selectedHandle 
    ? selectedHandle.price 
    : currentGroupHandles.length > 0 
      ? currentGroupHandles[0].price 
      : 0;

  return (
    <div className="text-sm space-y-1">
      <div className={`text-gray-600 ${disabled ? 'opacity-50' : ''}`}>{label}</div>
      
      {/* Компактный выбор: группа - ручка - цена */}
      <div className="flex items-center gap-3">
        {/* Селект группы */}
        <select
          value={selectedGroup || ''}
          onChange={(e) => handleGroupSelect(e.target.value)}
          disabled={disabled}
          className={`border border-black/20 px-3 py-2 text-black ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
          style={{ minWidth: '120px' }}
        >
          <option value="">Группа</option>
          {['Базовый', 'Комфорт', 'Бизнес'].map((groupName) => (
            handles[groupName] && (
              <option key={groupName} value={groupName}>
                {groupName}
              </option>
            )
          ))}
        </select>

        {/* Селект ручки */}
        <select
          value={value}
          onChange={(e) => handleHandleSelect(e.target.value)}
          disabled={disabled || !selectedGroup}
          className={`flex-1 border border-black/20 px-3 py-2 text-black ${disabled || !selectedGroup ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
        >
          <option value="">Выберите ручку</option>
          {currentGroupHandles.map((handle) => (
            <option key={handle.id} value={handle.id}>
              Ручка {handle.name} {handle.showroom ? '●' : '○'}
            </option>
          ))}
        </select>

        {/* Цена и информация */}
        <div className="flex items-center gap-2">
          {selectedHandle && (
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Показать информацию"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <div className="text-sm font-medium text-gray-900 min-w-[80px] text-right">
            {displayPrice ? `${displayPrice} ₽` : '—'}
          </div>
        </div>
      </div>

      {/* Информация о ручке */}
      {showInfo && selectedHandle && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
          <div className="space-y-1">
            <div><span className="font-medium">Поставщик:</span> {selectedHandle.supplier || 'Не указан'}</div>
            <div><span className="font-medium">Наименование:</span> {selectedHandle.factoryName || 'Не указано'}</div>
            <div><span className="font-medium">Артикул:</span> {selectedHandle.article || 'Не указан'}</div>
            <div><span className="font-medium">Наличие в шоуруме:</span> {selectedHandle.showroom ? 'Да' : 'Нет'}</div>
          </div>
        </div>
      )}

      {/* Кнопка сброса выбора */}
      {selectedHandle && (
        <button
          type="button"
          onClick={resetSelection}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Выбрать другую ручку
        </button>
      )}
    </div>
  );
}

function SelectMini({
  label,
  value,
  onChange,
  options,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowEmpty?: boolean;
}) {
  return (
    <label className="text-xs space-y-1">
      <div className="text-gray-600">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        className="w-full border border-black/20 px-2 py-1 text-xs text-black"
      >
        {allowEmpty && <option value="">—</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

