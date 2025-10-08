'use client';

// Гарантируем базовый API_URL в браузере
if (typeof window !== "undefined") {
  (window as any).__API_URL__ = (window as any).__API_URL__ ?? "/api";
}

import Link from "next/link";
import ExportButtons from "../components/ExportButtons"; // ПУТЬ ОТНОСИТЕЛЬНО /doors/page.tsx
import UnifiedExportButtons from "../../components/UnifiedExportButtons"; // Новый унифицированный компонент
import React, { useEffect, useMemo, useState } from "react";

// ===================== Типы =====================
type BasicState = {
  style?: string;
  model?: string;
  finish?: string;
  color?: string;
  type?: string;
  width?: number;
  height?: number;
  edge?: string;
  edge_note?: string;
  hardware_kit?: { id: string };
  handle?: { id: string };
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
  sku_1c?: string | number | null;
  edge?: string;
  edge_note?: string;
  hardwareKitId?: string;
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

type Domain =
  | {
      style?: string[];
      model?: string[];
      finish?: string[];
      color?: string[];
      type?: string[];
      width?: number[];
      height?: number[];
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
  !!(s.style && s.model && s.finish && s.color && s.type && s.width && s.height);

const API: string | null =
  typeof window !== "undefined" ? ((window as any).__API_URL__ as string) : null;

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Функция для форматирования названия модели под карточкой (убираем префикс DomeoDoors_ или Domeodoors_)
const formatModelNameForCard = (modelName: string): string => {
  return modelName
    .replace(/^DomeoDoors_/i, '') // Убираем префикс DomeoDoors_ (регистронезависимо)
    .replace(/^Domeodoors_/i, '') // Убираем префикс Domeodoors_ (регистронезависимо)
    .replace(/_/g, ' ') // Заменяем подчеркивания на пробелы
    .trim(); // Убираем лишние пробелы
};

// Функция для форматирования названия модели над большим фото (заменяем только подчеркивания)
const formatModelNameForPreview = (modelName: string): string => {
  return modelName.replace(/_/g, ' '); // Заменяем подчеркивания на пробелы
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
    const p = mockData.products.find(
      (x) =>
        x.model === selection.model &&
        x.style === selection.style &&
        x.finish === selection.finish &&
        x.color === selection.color &&
        x.type === selection.type &&
        x.width === selection.width &&
        x.height === selection.height
    );
    if (!p) throw new Error("Combination not found");
    const kit =
      selection.hardware_kit && selection.hardware_kit.id
        ? mockData.kits.find((k) => k.id === selection.hardware_kit.id)
        : undefined;
    const handle =
      selection.handle && selection.handle.id
        ? mockData.handles.find((h) => h.id === selection.handle.id)
        : undefined;
    const base = p.rrc_price;
    const addKit = kit ? kit.price_rrc : 0;
    const addHandle = handle ? handle.price_rrc : 0;
    const total = Math.round(base + addKit + addHandle);
    return {
      ok: true,
      currency: "RUB",
      base,
      breakdown: [
        { label: "Base RRC", amount: base },
        ...(kit ? [{ label: `Комплект: ${kit.name}`, amount: kit.price_rrc }] : []),
        ...(handle ? [{ label: `Ручка: ${handle.name}`, amount: handle.price_rrc }] : []),
      ],
      total,
      sku_1c: p.sku_1c,
    };
  },

  async kp(cart: { items: CartItem[] }): Promise<string> {
    const rows: string[] = [];
    let n = 1;
    for (const it of cart.items) {
      const parts: string[] = [];
      if (it.width && it.height) parts.push(`${it.width}×${it.height}`);
      if (it.color) parts.push(it.color);
      if (it.edge === "да") parts.push(`Кромка${it.edge_note ? `: ${it.edge_note}` : ""}`);
      const nameCore = `${it.model}${parts.length ? ` (${parts.join(", ")})` : ""}`;
      const sum = it.unitPrice * it.qty;
      rows.push(
        `<tr><td>${n}</td><td>${nameCore}</td><td class="num">${fmtInt(
          it.unitPrice
        )}</td><td class="num">${it.qty}</td><td class="num">${fmtInt(sum)}</td></tr>`
      );
      if (it.handleId) {
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
        const baseRow = `<tr>
        <td class="num">${idx + 1}</td>
        <td>${i.sku_1c || "—"}</td>
        <td>${i.model} (${i.width}×${i.height}${i.color ? `, ${i.color}` : ""})</td>
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

      lines.push(
        [
          String(n),
          (prod && (prod as any).supplier) || "",
          (prod && (prod as any).collection) || "",
          (prod && ((prod as any).supplier_item_name || prod.model)) || "",
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
              h.supplier_name || "",
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

const api = API ? realApi : mockApi;

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
  const [tab, setTab] = useState<"config" | "admin">("config");

  // Состояние конфигуратора
  const [sel, setSel] = useState<Partial<BasicState>>({});
  const [domain, setDomain] = useState<Domain>(null);
  const [models, setModels] = useState<{ model: string; style: string; photo?: string | null }[]>([]);
  const [price, setPrice] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [kpHtml, setKpHtml] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>('');
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

  const selectedModelCard = useMemo(
    () => {
      const found = Array.isArray(models) ? models.find((m) => m.model === sel.model) || null : null;
      console.log('🔍 selectedModelCard:', { 
        selModel: sel.model, 
        modelsCount: models?.length, 
        found: !!found,
        foundModel: found?.model 
      });
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
        const response = await api.getOptions(query);
        // Извлекаем domain из ответа API
        const domain = response?.domain || response;
        if (!c) setDomain(domain);
      } catch (e: any) {
        if (!c) setErr(e?.message ?? "Ошибка доменов");
      }
    })();
    return () => {
      c = true;
    };
  }, [query]);

  // Оптимизированная загрузка моделей и опций при изменении стиля
  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const styleKey = sel.style || 'all';
        
               // Проверяем клиентский кэш для моделей с проверкой времени
               const cached = modelsCache.get(styleKey);
               if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                 console.log('✅ Используем клиентский кэш для моделей');
                 setModels(cached.data);
                 setIsLoadingModels(false);
                 return;
               }
        
        setIsLoadingModels(true);
        
        // Оптимистичное обновление: показываем пустой список сразу
        if (!c) setModels([]);
        
        // Параллельная загрузка моделей и опций для ускорения
        const [modelsResponse, optionsResponse] = await Promise.all([
          fetch(`/api/catalog/doors/models-with-photos?style=${encodeURIComponent(sel.style || "")}`),
          fetch(`/api/catalog/doors/options?style=${encodeURIComponent(sel.style || "")}`)
        ]);
        
        if (!c) {
          // Обрабатываем модели
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            const rows = modelsData?.models || [];
            
            // Предзагружаем фото для всех моделей параллельно
            if (rows.length > 0) {
              console.log('🔄 Предзагружаем фото для всех моделей...');
              const photoPromises = rows.map(async (model: any) => {
                if (model.photo) return; // Уже есть фото
                
                try {
                  const response = await fetch(`/api/catalog/doors/photos?model=${encodeURIComponent(model.model)}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.photos && data.photos.length > 0) {
                      model.photo = data.photos[0];
                    }
                  }
                } catch (error) {
                  console.log('❌ Ошибка предзагрузки фото для:', model.model);
                }
              });
              
              // Ждем завершения всех загрузок фото
              await Promise.allSettled(photoPromises);
              console.log('✅ Предзагрузка фото завершена');
            }
            
            setModels(rows);
            
                   // Сохраняем в клиентский кэш с временной меткой
                   setModelsCache(prev => {
                     const newCache = new Map(prev);
                     newCache.set(styleKey, {
                       data: rows,
                       timestamp: Date.now()
                     });
                     return newCache;
                   });
          }
          
          // Обрабатываем опции (если нужно)
          if (optionsResponse.ok) {
            const optionsData = await optionsResponse.json();
            // Здесь можно обновить опции если нужно
            console.log('✅ Опции загружены параллельно:', optionsData);
          }
          
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
  }, [sel.style, modelsCache]);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!hasBasic(sel)) {
        setPrice(null);
        return;
      }
      try {
        const p = await api.price(sel);
        if (!c) setPrice(p);
      } catch (e: any) {
        if (!c) setErr(e?.message ?? "Ошибка расчёта");
      }
    })();
    return () => {
      c = true;
    };
  }, [sel]);

  // Автоматическое сворачивание блока стилей при выборе стиля
  useEffect(() => {
    if (sel.style) {
      setIsStyleCollapsed(true);
    }
  }, [sel.style]);

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
    const item: CartItem = {
      id: uid(),
      style: sel.style,
      model: sel.model,
      finish: sel.finish,
      type: sel.type,
      width: sel.width,
      height: sel.height,
      color: sel.color,
      qty: 1,
      unitPrice: price.total,
      handleId: (sel.handle && sel.handle.id) || undefined,
      sku_1c: price.sku_1c,
      edge: sel.edge,
      edge_note: sel.edge_note,
      hardwareKitId: (sel.hardware_kit && sel.hardware_kit.id) || undefined,
      baseAtAdd: price.total,
    };
    setCart((c) => [...c, item]);
  };
  const removeFromCart = (id: string) =>
    setCart((c) => c.filter((i) => i.id !== id));
  const changeQty = (id: string, qty: number) =>
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));

  const ensureItemDomain = async (item: { model: string; style?: string }) => {
    if (itemDomains[item.model]) return itemDomains[item.model];
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

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-black/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline space-x-3">
              <Link href="/" className="text-2xl font-bold text-black">
                Domeo
              </Link>
              <span className="text-black text-lg font-bold">•</span>
              <span className="text-lg font-semibold text-black">Doors</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
              >
              ← Категории
            </Link>
            <button
              onClick={() => setTab("config")}
              className={`px-3 py-1 border transition-all duration-200 text-sm ${
                tab === "config" 
                  ? "bg-black text-white border-black" 
                  : "border-black text-black hover:bg-black hover:text-white"
              }`}
            >
              Конфигуратор
            </button>
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
          </nav>
          </div>
        </div>
      </header>

      {tab === "config" && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
          <main className="lg:col-span-1 space-y-8">
            <section>
              <div className="mb-3">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {styleTiles.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSel((v) => ({ 
                      ...v, 
                      style: s.key, 
                      model: undefined,
                      finish: undefined,
                      color: undefined,
                      type: undefined,
                      width: undefined,
                      height: undefined
                    }))}
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
              </div>
            </section>

            {sel.style && (
              <section>
                <div className="mb-3">
                  <h2 className="text-xl font-semibold text-black">
                    Модели
                  </h2>
                </div>
                {Array.isArray(models) && models.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                    {models.map((m) => (
                      <DoorCard
                        key={m.model}
                        item={m}
                        selected={sel.model === m.model}
                        onSelect={() => setSel((v) => ({ ...v, model: m.model }))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600 text-center py-8">Нет моделей для выбранного стиля</div>
                )}
              </section>
            )}

            {sel.model && (
              <section className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Покрытие"
                    value={sel.finish || ""}
                    onChange={(v: string) => setSel((s) => ({ ...s, finish: v }))}
                    options={(domain?.finish || []) as string[]}
                  />
                  <Select
                    label="Цвет"
                    value={sel.color || ""}
                    onChange={(v: string) => setSel((s) => ({ ...s, color: v }))}
                    options={(domain?.color || []) as string[]}
                  />
                  <Select
                    label="Тип"
                    value={sel.type || ""}
                    onChange={(v: string) => setSel((s) => ({ ...s, type: v }))}
                    options={(domain?.type || []) as string[]}
                  />
                  <Select
                    label="Ширина"
                    value={sel.width?.toString() || ""}
                    onChange={(v: string) => setSel((s) => ({ ...s, width: Number(v) }))}
                    options={((domain?.width || []) as number[]).map(String)}
                  />
                  <Select
                    label="Высота"
                    value={sel.height?.toString() || ""}
                    onChange={(v: string) => setSel((s) => ({ ...s, height: Number(v) }))}
                    options={((domain?.height || []) as number[]).map(String)}
                  />
                  <Select
                    label="Кромка"
                    value={sel.edge || ""}
                    onChange={(v: string) => setSel((s) => ({ ...s, edge: v }))}
                    options={["да", "нет"]}
                    allowEmpty
                  />
                  {sel.edge === "да" && (
                    <label className="text-sm space-y-1">
                      <div className="text-gray-600">Примечание к кромке</div>
                      <input
                        value={sel.edge_note || ""}
                        onChange={(e) =>
                          setSel((s) => ({
                            ...s,
                            edge_note: (e.target as HTMLInputElement).value,
                          }))
                        }
                        className="w-full border border-black/20 px-3 py-2 text-black"
                        placeholder="например: ABS BLACK"
                      />
                    </label>
                  )}
                </div>

                <div className="bg-black/5 border border-black/10 p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-black">Выбор фурнитуры и ручек</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="Комплект фурнитуры"
                        value={(sel.hardware_kit && sel.hardware_kit.id) || ""}
                        onChange={(v: string) =>
                          setSel((s) => ({ ...s, hardware_kit: v ? { id: v } : undefined }))
                        }
                        options={((domain?.kits || []) as DomainKits).map((k) => k.id)}
                        allowEmpty
                      />
                    </div>
                    <div>
                      <Select
                        label="Ручка"
                        value={(sel.handle && sel.handle.id) || ""}
                        onChange={(v: string) =>
                          setSel((s) => ({ ...s, handle: v ? { id: v } : undefined }))
                        }
                        options={((domain?.handles || []) as DomainHandles).map((h) => h.id)}
                        allowEmpty
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    disabled={!hasBasic(sel)}
                    onClick={addToCart}
                    className="px-6 py-3 bg-black text-white hover:bg-yellow-400 hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    В расчёт
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

          <section className="lg:col-span-1">
            <div className="sticky top-6">
              <StickyPreview
                item={
                  sel.model ? { 
                    model: sel.model, 
                    sku_1c: price?.sku_1c,
                    photo: selectedModelCard?.photo || null
                  } : null
                }
              />
            </div>
          </section>

          <aside className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <div className="bg-white border border-black/10 p-6">
                <h2 className="text-xl font-semibold text-black mb-4">Параметры</h2>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Стиль:</span>
                    <span className="text-black font-medium">{sel.style || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Покрытие и цвет:</span>
                    <span className="text-black font-medium">
                    {sel.finish || "—"}
                    {sel.color ? `, ${sel.color}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Кромка:</span>
                    <span className="text-black font-medium">
                    {sel.edge === "да"
                      ? sel.edge_note
                        ? `Кромка: ${sel.edge_note}`
                        : "Кромка"
                      : "Отсутствует"}
                    </span>
                  </div>
                </div>
                <div className="mt-6 text-3xl font-bold text-black">
                  {price ? `${fmtInt(price.total)} ₽` : "—"}
                </div>
              </div>

              <div className="bg-white border border-black/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-black">Корзина ({cart.length})</h2>
                  <div className="text-xs text-gray-600">
                    Итого:{" "}
                    <span className="font-semibold text-black">
                      {fmtInt(cart.reduce((s, i) => s + i.unitPrice * i.qty, 0))} ₽
                    </span>
                  </div>
                </div>
                
                {cart.length ? (
                  <div className="space-y-2">
                    {cart.map((i) => (
                      <div key={i.id} className="border border-black/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-black text-sm">
                            {i.model} — {i.type || "—"}
                          </div>
                          <div className="text-xs font-semibold text-black">
                            {fmtInt(i.unitPrice * i.qty)} ₽
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 leading-tight">
                          {i.color ? `${i.color}, ` : ""}
                          {i.width}×{i.height}
                          {i.edge === "да"
                            ? `, Кромка${i.edge_note ? `: ${i.edge_note}` : ""}`
                            : ""}
                          {i.hardwareKitId
                            ? `, Комплект: ${
                                mockData.kits.find((k) => k.id === i.hardwareKitId)?.name
                              }`
                            : ""}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <input
                            type="number"
                            min={1}
                            value={i.qty}
                            className="w-16 border border-black/20 px-2 py-1 text-black"
                            onChange={(e) =>
                              changeQty(i.id, Number((e.target as HTMLInputElement).value) || 1)
                            }
                          />
                          <div className="text-xs text-gray-500">
                            Δ {fmtInt(i.unitPrice - i.baseAtAdd)} ₽
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="text-xs text-black hover:text-yellow-400 transition-colors duration-200"
                              onClick={async () => {
                                setEditingId(editingId === i.id ? null : i.id);
                                if (editingId !== i.id)
                                  await ensureItemDomain({
                                    model: i.model as string,
                                    style: i.style,
                                  });
                              }}
                            >
                              Изменить
                            </button>
                            <button
                              className="text-xs text-red-600 hover:text-red-800 transition-colors duration-200"
                              onClick={() => removeFromCart(i.id)}
                            >
                              Удалить
                            </button>
                          </div>
                        </div>
                        {editingId === i.id && (
                          <div className="bg-black/5 border border-black/10 p-2 grid grid-cols-2 gap-1">
                            <SelectMini
                              label="Покрытие"
                              value={i.finish || ""}
                              options={(itemDomains[i.model!]?.finish || []) as string[]}
                              onChange={async (v: string) => {
                                changeItem(i.id, { finish: v });
                                await recalcItem(i.id);
                              }}
                            />
                            <SelectMini
                              label="Цвет"
                              value={i.color || ""}
                              options={(itemDomains[i.model!]?.color || []) as string[]}
                              onChange={async (v: string) => {
                                changeItem(i.id, { color: v });
                                await recalcItem(i.id);
                              }}
                            />
                            <SelectMini
                              label="Тип"
                              value={i.type || ""}
                              options={(itemDomains[i.model!]?.type || []) as string[]}
                              onChange={async (v: string) => {
                                changeItem(i.id, { type: v });
                                await recalcItem(i.id);
                              }}
                            />
                            <SelectMini
                              label="Ширина"
                              value={i.width?.toString() || ""}
                              options={((itemDomains[i.model!]?.width) || ([] as number[])).map(
                                String
                              )}
                              onChange={async (v: string) => {
                                changeItem(i.id, { width: Number(v) });
                                await recalcItem(i.id);
                              }}
                            />
                            <SelectMini
                              label="Высота"
                              value={i.height?.toString() || ""}
                              options={((itemDomains[i.model!]?.height) || ([] as number[])).map(
                                String
                              )}
                              onChange={async (v: string) => {
                                changeItem(i.id, { height: Number(v) });
                                await recalcItem(i.id);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-6 text-sm">Корзина пуста</div>
                )}

                {/* Кнопки экспорта в корзине */}
                <div className="mt-4 pt-3 border-t border-black/10">
                  <div className="flex flex-wrap gap-2">
                  <UnifiedExportButtons
                    getCart={() => cart.map(item => ({
                      productId: parseInt(item.sku_1c?.toString() || '0'),
                      qty: item.qty,
                      kitId: item.hardwareKitId,
                      handleId: item.handleId,
                      model: item.model,
                      width: item.width,
                      height: item.height,
                      color: item.color,
                      finish: item.finish,
                      type: item.type
                    }))}
                    acceptedKPId={selectedClient}
                    compact={true}
                    className="flex space-x-2"
                  />
                  </div>
                </div>
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
    </div>
  );
}

// ===================== Вспомогательные компоненты =====================
function DoorCard({
  item,
  selected,
  onSelect,
}: {
  item: { model: string; style?: string; photo?: string | null };
  selected: boolean;
  onSelect: () => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Если фото уже предзагружено в item.photo, используем его
    if (item.photo) {
      const imageUrl = item.photo.startsWith('/uploads') ? item.photo : `/uploads${item.photo}`;
      setImageSrc(imageUrl);
      setIsLoading(false);
      return;
    }

    // Fallback: загружаем фото через старый API (для совместимости)
    const loadRealPhoto = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Загружаем реальное фото для:', item.model);

        const response = await fetch(`/api/catalog/doors/photos?model=${encodeURIComponent(item.model)}`);

        if (response.ok) {
          const data = await response.json();
          console.log('📸 Ответ API:', data);

          if (data.photos && data.photos.length > 0) {
            const photoPath = data.photos[0];
            console.log('🔍 Путь к изображению от API:', photoPath);

            // Преобразуем путь /uploads/products/... в /uploads/products/... (убираем /api)
            const imageUrl = photoPath.startsWith('/uploads') ? photoPath : `/uploads${photoPath}`;
            console.log('✅ Финальный URL:', imageUrl);

            setImageSrc(imageUrl);
          } else {
            console.log('❌ Фото не найдено для:', item.model);
            setImageSrc(null);
          }
        } else {
          console.log('❌ Ошибка API:', response.status);
          setImageSrc(null);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки фото:', error);
        setImageSrc(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadRealPhoto();
  }, [item.model, item.photo]);

  return (
    <div className="flex flex-col">
    <button
      onClick={onSelect}
      aria-label={`Выбрать модель ${item.model}`}
      className={[
          "group w-full text-left bg-white overflow-hidden",
        "hover:shadow-md transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ring-offset-2",
          selected ? "shadow-md" : "",
      ].join(" ")}
    >
        {/* Фото полностью заполняет карточку с правильным соотношением сторон для дверей */}
        <div className="aspect-[16/33] w-full bg-gray-50">
          {isLoading ? (
            <div className="h-full w-full animate-pulse bg-gray-200" />
          ) : imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={item.model}
              className="h-full w-full object-contain"
              onError={() => {
                console.log('❌ Ошибка загрузки изображения:', imageSrc);
                setImageSrc(null);
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-sm">Нет фото</div>
                <div className="text-[14px] whitespace-nowrap" title={formatModelNameForCard(item.model)}>
                  {formatModelNameForCard(item.model)}
        </div>
        </div>
            </div>
          )}
      </div>
    </button>
      {/* Название модели под карточкой */}
      <div className="mt-2 flex justify-center">
        <div className="text-[14px] font-medium text-gray-900 whitespace-nowrap" title={formatModelNameForCard(item.model)}>
          {formatModelNameForCard(item.model)}
        </div>
      </div>
    </div>
  );
}

function StickyPreview({ item }: { item: { model: string; sku_1c?: any; photo?: string | null } | null }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!item?.model) {
      setImageSrc(null);
      setIsLoading(false);
      return;
    }

    // Если фото уже предзагружено в item.photo, используем его мгновенно
    if (item.photo) {
      const imageUrl = item.photo.startsWith('/uploads') ? item.photo : `/uploads${item.photo}`;
      setImageSrc(imageUrl);
      setIsLoading(false);
      return;
    }

    // Fallback: загружаем фото через старый API (для совместимости)
    const loadPhoto = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Загружаем фото для превью:', item.model);

        const response = await fetch(`/api/catalog/doors/photos?model=${encodeURIComponent(item.model)}`);

        if (response.ok) {
          const data = await response.json();
          if (data.photos && data.photos.length > 0) {
            const photoPath = data.photos[0];
            const imageUrl = photoPath.startsWith('/uploads') ? photoPath : `/uploads${photoPath}`;
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
  }, [item?.model, item?.photo]);

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
            alt={item.model}
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
              <div className="text-xs">{item.model}</div>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowEmpty?: boolean;
}) {
  return (
    <label className="text-sm space-y-1">
      <div className="text-gray-600">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        className="w-full border border-black/20 px-3 py-2 text-black"
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
