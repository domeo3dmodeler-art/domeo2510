'use client';

// Р“Р°СЂР°РЅС‚РёСЂСѓРµРј Р±Р°Р·РѕРІС‹Р№ API_URL РІ Р±СЂР°СѓР·РµСЂРµ
if (typeof window !== "undefined") {
  (window as any).__API_URL__ = (window as any).__API_URL__ ?? "/api";
}

import Link from "next/link";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { PhotoGallery } from "../../components/PhotoGallery";
import { ModernPhotoGallery } from "../../components/ModernPhotoGallery";
import { priceRecalculationService } from "@/lib/cart/price-recalculation-service";
import { getCurrentUser } from "@/lib/auth/token-interceptor";
import { useAuth } from "@/lib/auth/AuthContext";
import GlobalHeader from "../../components/layout/GlobalHeader";
import NotificationBell from "../../components/ui/NotificationBell";
import HandleSelectionModal from "../../components/HandleSelectionModal";
import { clientLogger } from "@/lib/logging/client-logger";
import { fetchWithAuth } from "@/lib/utils/fetch-with-auth";
import { parseApiResponse } from "@/lib/utils/parse-api-response";
import { useDebounce } from "@/hooks/useDebounce";
import { DoorCard, StickyPreview, Select, HardwareSelect, HandleSelect, SelectMini, DoorFilters, DoorList, DoorConfiguration, DoorPreview, DoorSidebar, CartManager } from "@/components/doors";
import type { BasicState, CartItem, Domain, HardwareKit, Handle, ModelItem } from "@/components/doors";
import { resetDependentParams, formatModelNameForCard, formatModelNameForPreview, fmtInt, fmt2, uid, hasBasic, slugify, findHandleById, findHardwareKitById } from "@/components/doors";
import { OrderDetailsModal } from "@/components/complectator/OrderDetailsModal";
import { CreateClientModal } from "@/components/clients/CreateClientModal";

// РўРёРїС‹ Рё СѓС‚РёР»РёС‚С‹ РёРјРїРѕСЂС‚РёСЂСѓСЋС‚СЃСЏ РёР· @/components/doors

// Р›РѕРєР°Р»СЊРЅС‹Рµ С‚РёРїС‹ (РёСЃРїРѕР»СЊР·СѓСЋС‚СЃСЏ С‚РѕР»СЊРєРѕ РІ СЌС‚РѕРј С„Р°Р№Р»Рµ)
type ProductLike = {
  sku_1c?: string | number | null;
  model?: string | null;
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

const API: string | null =
  typeof window !== "undefined" ? ((window as any).__API_URL__ as string) : null;

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

// ===================== MOCK (РґР»СЏ Р¶РёРІРѕСЃС‚Рё Р±РµР· Р±СЌРєР°) =====================
const mockData = {
  products: [
    {
      model: "PG Base 1",
      modelPhoto: "/media/doors/pg-base-1.jpg",
      style: "РЎРѕРІСЂРµРјРµРЅРЅР°СЏ",
      finish: "РќР°РЅРѕС‚РµРєСЃ",
      color: "Р‘РµР»С‹Р№",
      type: "Р Р°СЃРїР°С€РЅР°СЏ",
      width: 800,
      height: 2000,
      rrc_price: 21280,
      sku_1c: "SKU-PG-800-2000-BEL",
      supplier: "Supplier1",
      collection: "Collection A",
      supplier_item_name: "PG Base 1",
      supplier_color_finish: "Р‘РµР»С‹Р№/РќР°РЅРѕС‚РµРєСЃ",
      price_opt: 13832,
    },
    {
      model: "PO Base 1/1",
      modelPhoto: "/media/doors/po-base-1-1.jpg",
      style: "РЎРѕРІСЂРµРјРµРЅРЅР°СЏ",
      finish: "РќР°РЅРѕС‚РµРєСЃ",
      color: "Р‘РµР»С‹Р№",
      type: "Р Р°СЃРїР°С€РЅР°СЏ",
      width: 800,
      height: 2000,
      rrc_price: 22900,
      sku_1c: "SKU-PO11-800-2000-BEL",
      supplier: "Supplier1",
      collection: "Collection A",
      supplier_item_name: "PO Base 1/1",
      supplier_color_finish: "Р‘РµР»С‹Р№/РќР°РЅРѕС‚РµРєСЃ",
      price_opt: 14885,
    },
    {
      model: "PO Base 1/2",
      modelPhoto: "/media/doors/po-base-1-2.jpg",
      style: "РЎРѕРІСЂРµРјРµРЅРЅР°СЏ",
      finish: "РќР°РЅРѕС‚РµРєСЃ",
      color: "Р‘РµР»С‹Р№",
      type: "Р Р°СЃРїР°С€РЅР°СЏ",
      width: 900,
      height: 2000,
      rrc_price: 23900,
      sku_1c: "SKU-PO12-900-2000-BEL",
      supplier: "Supplier1",
      collection: "Collection A",
      supplier_item_name: "PO Base 1/2",
      supplier_color_finish: "Р‘РµР»С‹Р№/РќР°РЅРѕС‚РµРєСЃ",
      price_opt: 15535,
    },
    {
      model: "Neo-1",
      modelPhoto: "/media/doors/neo1.jpg",
      style: "РќРµРѕРєР»Р°СЃСЃРёРєР°",
      finish: "Р­РјР°Р»СЊ",
      color: "РЎР»РѕРЅРѕРІР°СЏ РєРѕСЃС‚СЊ",
      type: "Р Р°СЃРїР°С€РЅР°СЏ",
      width: 800,
      height: 2000,
      rrc_price: 27900,
      sku_1c: "SKU-NEO1-800-2000-IV",
      supplier: "Supplier2",
      collection: "Neo",
      supplier_item_name: "Neo-1",
      supplier_color_finish: "РЎР»РѕРЅРѕРІР°СЏ РєРѕСЃС‚СЊ/Р­РјР°Р»СЊ",
      price_opt: 18135,
    },
  ],
  kits: [
    { id: "KIT_STD", name: "Р‘Р°Р·РѕРІС‹Р№ РєРѕРјРїР»РµРєС‚", group: 1, price_rrc: 5000 },
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
  async getOptions(query: URLSearchParams): Promise<{ ok: true; domain: Domain }> {
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
    const domain: Partial<Domain> = {};
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
        ).sort((a: string | number, b: string | number) => (a > b ? 1 : a < b ? -1 : 0));
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
    // РСЃРїРѕР»СЊР·СѓРµРј СЂРµР°Р»СЊРЅС‹Р№ API РґР»СЏ СЂР°СЃС‡РµС‚Р° С†РµРЅС‹
    const response = await fetchWithAuth('/api/price/doors', {
      method: 'POST',
      body: JSON.stringify(selection)
    });
    
    if (!response.ok) {
      throw new Error('Price calculation failed');
    }
    
    let priceData: unknown;
    try {
      priceData = await response.json();
    } catch (jsonError) {
      throw new Error('Failed to parse price response');
    }
    
    // РџР°СЂСЃРёРј РѕС‚РІРµС‚ API
    const parsedData = parseApiResponse<{ total?: number; breakdown?: unknown[]; sku_1c?: string | number | null }>(priceData);
    
    // РџРѕРєР° С‡С‚Рѕ РІРѕР·РІСЂР°С‰Р°РµРј С‚РѕР»СЊРєРѕ Р±Р°Р·РѕРІСѓСЋ С†РµРЅСѓ РґРІРµСЂРё
    // Р¦РµРЅР° РєРѕРјРїР»РµРєС‚Р° Рё СЂСѓС‡РєРё Р±СѓРґРµС‚ РґРѕР±Р°РІР»РµРЅР° РІ РєРѕРјРїРѕРЅРµРЅС‚Рµ
    const priceObj = parsedData || { total: 0, breakdown: [], sku_1c: null };
    return {
      ok: true,
      currency: "RUB",
      base: priceObj.total || 0,
      breakdown: priceObj.breakdown || [],
      total: priceObj.total || 0,
      sku_1c: priceObj.sku_1c || null,
    };
  },

  async kp(cart: { items: CartItem[] }): Promise<string> {
    const rows: string[] = [];
    let n = 1;
    for (const it of cart.items) {
      const parts: string[] = [];
      if (it.width && it.height) parts.push(`${it.width}Г—${it.height}`);
      if (it.color) parts.push(it.color);
      // if (it.edge === "РґР°") parts.push(`РљСЂРѕРјРєР°${it.edge_note ? `: ${it.edge_note}` : ""}`);
      
      // РќР°С…РѕРґРёРј РїСЂР°РІРёР»СЊРЅРѕРµ РЅР°Р·РІР°РЅРёРµ РјРѕРґРµР»Рё
      const modelName = it.model ? formatModelNameForCard(it.model) : 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РјРѕРґРµР»СЊ';
      
      const nameCore = `${modelName}${parts.length ? ` (${parts.join(", ")})` : ""}`;
      const sum = it.unitPrice * it.qty;
      rows.push(
        `<tr><td>${n}</td><td>${nameCore}</td><td class="num">${fmtInt(
          it.unitPrice
        )}</td><td class="num">${it.qty}</td><td class="num">${fmtInt(sum)}</td></tr>`
      );
      if (it.handleId) {
        // Р’СЂРµРјРµРЅРЅРѕ РёСЃРїРѕР»СЊР·СѓРµРј mock РґР°РЅРЅС‹Рµ РґР»СЏ СЌРєСЃРїРѕСЂС‚Р°
        const h = mockData.handles.find((h) => h.id === it.handleId);
        if (h) {
          const handleRetail = Math.round(h.price_opt! * h.price_group_multiplier!);
          const hSum = handleRetail * it.qty;
          rows.push(
            `<tr class="sub"><td></td><td>Р СѓС‡РєР°: ${h.name} вЂ” ${fmtInt(
              handleRetail
            )} Г— ${it.qty} = ${fmtInt(hSum)}</td><td class="num">${fmtInt(
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
      <h1>РљРѕРјРјРµСЂС‡РµСЃРєРѕРµ РїСЂРµРґР»РѕР¶РµРЅРёРµ вЂ” Doors</h1>
      <table><thead><tr><th>в„–</th><th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th><th>Р¦РµРЅР° Р Р Р¦, СЂСѓР±</th><th>РљРѕР»РёС‡РµСЃС‚РІРѕ</th><th>РЎСѓРјРјР°, СЂСѓР±</th></tr></thead>
      <tbody>${rows.join("")}</tbody></table></body></html>`;
  },

  async invoice(cart: { items: CartItem[] }): Promise<string> {
    const total = cart.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    const rows = cart.items
      .flatMap((i, idx) => {
        // РќР°С…РѕРґРёРј РїСЂР°РІРёР»СЊРЅРѕРµ РЅР°Р·РІР°РЅРёРµ РјРѕРґРµР»Рё
        const modelName = i.model ? formatModelNameForCard(i.model) : 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РјРѕРґРµР»СЊ';
        
        const baseRow = `<tr>
        <td class="num">${idx + 1}</td>
        <td>${i.sku_1c || "вЂ”"}</td>
        <td>${modelName} (${i.width}Г—${i.height}${i.color ? `, ${i.color}` : ""})</td>
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
        <td>${handle.supplier_sku || "вЂ”"}</td>
        <td>Р СѓС‡РєР°: ${handle.name}</td>
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
      <h1>РЎС‡РµС‚ РЅР° РѕРїР»Р°С‚Сѓ</h1>
      <div class="row"><div>РџРѕРєСѓРїР°С‚РµР»СЊ: вЂ”</div><div>РРќРќ: вЂ”</div></div>
      <table><thead><tr><th>в„–</th><th>РђСЂС‚РёРєСѓР»</th><th>РќР°РёРјРµРЅРѕРІР°РЅРёРµ</th><th>Р¦РµРЅР°, СЂСѓР±</th><th>РљРѕР»-РІРѕ</th><th>РЎСѓРјРјР°, СЂСѓР±</th></tr></thead><tbody>
        ${rows}
      </tbody></table>
      <h3>РС‚РѕРіРѕ: ${fmtInt(total)} в‚Ѕ</h3>
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

      // РќР°С…РѕРґРёРј РїСЂР°РІРёР»СЊРЅРѕРµ РЅР°Р·РІР°РЅРёРµ РјРѕРґРµР»Рё
      const modelName = i.model ? formatModelNameForCard(i.model) : 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РјРѕРґРµР»СЊ';
      
      lines.push(
        [
          String(n),
          (prod && (prod as any).supplier) || "",
          (prod && (prod as any).collection) || "",
          (prod && ((prod as any).supplier_item_name || modelName)) || "",
          (prod && (prod as any).supplier_color_finish) || "",
          String(i.width || ""),
          String(i.height || ""),
          kit ? `${kit.name} (РіСЂ. ${kit.group})` : "",
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
              `Р СѓС‡РєР°: ${h.name}`,
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
    const r = await fetchWithAuth(`${API}/catalog/doors/options?${query.toString()}`);
    if (!r.ok) throw new Error(`options HTTP ${r.status}`);
    const data = await r.json();
    return parseApiResponse(data);
  },
  async listModelsByStyle(style?: string): Promise<any> {
    const r = await fetchWithAuth(
      `${API}/catalog/doors/models?style=${encodeURIComponent(style || "")}`
    );
    if (!r.ok) throw new Error(`models HTTP ${r.status}`);
    const data = await r.json();
    return parseApiResponse(data);
  },
  async price(selection: any): Promise<any> {
    const r = await fetchWithAuth(`${API}/price/doors`, {
      method: "POST",
      body: JSON.stringify({ selection }),
    });
    if (!r.ok) throw new Error(`price HTTP ${r.status}`);
    const data = await r.json();
    return parseApiResponse(data);
  },
  async kp(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetchWithAuth(`${API}/cart/export/doors/kp`, {
      method: "POST",
      body: JSON.stringify({ cart }),
    });
    if (!r.ok) throw new Error(`kp HTTP ${r.status}`);
    return r.text();
  },
  async invoice(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetchWithAuth(`${API}/cart/export/doors/invoice`, {
      method: "POST",
      body: JSON.stringify({ cart }),
    });
    if (!r.ok) throw new Error(`invoice HTTP ${r.status}`);
    return r.text();
  },
  async factory(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetchWithAuth(`${API}/cart/export/doors/factory`, {
      method: "POST",
      body: JSON.stringify({ cart }),
    });
    if (!r.ok) throw new Error(`factory HTTP ${r.status}`);
    return r.text();
  },

  // AUTH (Bearer) вЂ” __API_URL__ СѓР¶Рµ '/api', Р±РµР· Р»РёС€РЅРµРіРѕ /api
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

const api = mockApi; // Р’СЂРµРјРµРЅРЅРѕ РёСЃРїРѕР»СЊР·СѓРµРј mockApi РґР»СЏ РѕС‚Р»Р°РґРєРё

// --- helper: resolve selection by SKU (prefill calculator) ---
async function resolveSelectionBySku(sku: string) {
  const r = await fetchWithAuth("/api/catalog/doors/sku-to-selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku }),
  });
  if (!r.ok) throw new Error(`resolve ${r.status}`);
  let data: unknown;
  try {
    data = await r.json();
  } catch (jsonError) {
    throw new Error('Failed to parse selection response');
  }
  return data as { ok: boolean; selection?: unknown };
}

// ===================== Р’СЃРїРѕРјРѕРіР°С‚РµР»СЊРЅС‹Рµ С„СѓРЅРєС†РёРё =====================
// ===================== РЎС‚СЂР°РЅРёС†Р° Doors =====================
export default function DoorsPage() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<"config" | "admin">("config");

  // РЎРѕСЃС‚РѕСЏРЅРёРµ РєРѕРЅС„РёРіСѓСЂР°С‚РѕСЂР°
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
  
  // РЎРѕСЃС‚РѕСЏРЅРёРµ РґР»СЏ СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ РєРѕСЂР·РёРЅС‹
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

  // РџРѕР»СѓС‡Р°РµРј СЂРѕР»СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserRole(user.role || 'complectator');
    } else {
      setUserRole('guest'); // РќРµР°РІС‚РѕСЂРёР·РѕРІР°РЅРЅС‹Р№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ
    }
  }, [isAuthenticated, user]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setClientSearch(clientSearchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [clientSearchInput]);

  const formatPhone = (raw?: string) => {
    if (!raw) return 'вЂ”';
    const digits = raw.replace(/\D/g, '');
    // Expect 11 digits for Russia starting with 7 or 8
    const d = digits.length === 11 ? digits.slice(-10) : digits.slice(-10);
    if (d.length < 10) return raw;
    return `+7 (${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,8)}-${d.slice(8,10)}`;
  };

  // РЎРѕС…СЂР°РЅРµРЅРёРµ РєРѕСЂР·РёРЅС‹ РІ localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('domeo-cart', JSON.stringify(cart));
      localStorage.setItem('domeo-original-prices', JSON.stringify(originalPrices));
    }
  }, [cart, originalPrices]);

  // Р—Р°РіСЂСѓР·РєР° РєРѕСЂР·РёРЅС‹ РёР· localStorage РїСЂРё РёРЅРёС†РёР°Р»РёР·Р°С†РёРё
  useEffect(() => {
    const savedCart = localStorage.getItem('domeo-cart');
    const savedPrices = localStorage.getItem('domeo-original-prices');
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        clientLogger.error('Error loading cart from localStorage:', error);
      }
    }
    
    if (savedPrices) {
      try {
        const parsedPrices = JSON.parse(savedPrices);
        setOriginalPrices(parsedPrices);
      } catch (error) {
        clientLogger.error('Error loading original prices from localStorage:', error);
      }
    }
  }, []);

  // Р—Р°РіСЂСѓР·РєР° РєР»РёРµРЅС‚РѕРІ
  const fetchClients = useCallback(async () => {
    try {
      setClientsLoading(true);
      const response = await fetchWithAuth('/api/clients');
      if (!response.ok) {
        clientLogger.error('Failed to fetch clients:', response.status, response.statusText);
        setClients([]);
        return;
      }
      
        let data: unknown;
        try {
          data = await response.json();
        } catch (jsonError) {
          clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° clients:', jsonError);
          setClients([]);
          return;
        }
      
      // РџР°СЂСЃРёРј РѕС‚РІРµС‚ РІ С„РѕСЂРјР°С‚Рµ apiSuccess
      const { parseApiResponse } = await import('@/lib/utils/parse-api-response');
      const parsedData = parseApiResponse<{ clients: any[]; pagination?: any }>(data);
      
      if (parsedData && Array.isArray(parsedData.clients)) {
        setClients(parsedData.clients);
      } else {
        clientLogger.error('РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ РґР°РЅРЅС‹С… РєР»РёРµРЅС‚РѕРІ:', parsedData);
        setClients([]);
      }
    } catch (error) {
      clientLogger.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  // Р—Р°РіСЂСѓР¶Р°РµРј РєР»РёРµРЅС‚РѕРІ РїСЂРё РѕС‚РєСЂС‹С‚РёРё РјРµРЅРµРґР¶РµСЂР°
  useEffect(() => {
    if (showClientManager) {
      fetchClients();
    }
  }, [showClientManager, fetchClients]);


  const [kpHtml, setKpHtml] = useState<string>("");
  
  // РЎРѕСЃС‚РѕСЏРЅРёРµ РґР»СЏ РёРЅС‚РµСЂР°РєС‚РёРІРЅРѕР№ С„РёС€РєРё
  const [isModelSelected, setIsModelSelected] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemDomains, setItemDomains] = useState<Record<string, Domain>>({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // РљР»РёРµРЅС‚СЃРєРѕРµ РєСЌС€РёСЂРѕРІР°РЅРёРµ РґР»СЏ РјРѕРґРµР»РµР№ СЃ С„РѕС‚Рѕ
  // РЈР»СѓС‡С€РµРЅРЅРѕРµ РєСЌС€РёСЂРѕРІР°РЅРёРµ РјРѕРґРµР»РµР№
  const [modelsCache, setModelsCache] = useState<Map<string, { data: ModelItem[], timestamp: number }>>(new Map());
  const CACHE_TTL = 10 * 60 * 1000; // 10 РјРёРЅСѓС‚ РєСЌС€ РЅР° РєР»РёРµРЅС‚Рµ
  
  // РЎРѕСЃС‚РѕСЏРЅРёРµ СЃРІРѕСЂР°С‡РёРІР°РЅРёСЏ Р±Р»РѕРєР° СЃС‚РёР»РµР№
  const [isStyleCollapsed, setIsStyleCollapsed] = useState(false);
  // РЎРѕСЃС‚РѕСЏРЅРёРµ СЃРІРѕСЂР°С‡РёРІР°РЅРёСЏ Р±Р»РѕРєР° РјРѕРґРµР»РµР№
  const [isModelCollapsed, setIsModelCollapsed] = useState(false);
  
  // РЎРѕСЃС‚РѕСЏРЅРёРµ РґР»СЏ СЃС‚РѕРёРјРѕСЃС‚Рё РєСЂРѕРјРєРё (РІСЂРµРјРµРЅРЅРѕ РѕС‚РєР»СЋС‡РµРЅРѕ)
  // const [edgeCostData, setEdgeCostData] = useState<{
  //   hasCost: boolean;
  //   costValues: string[];
  //   sampleProduct: any;
  //   hasNoEdgeWithoutCost: number;
  //   hasNoEdgeWithCost: number;
  //   hasSpecificEdgeProducts: number;
  //   isEdgeUnavailable: boolean;
  // } | null>(null);

  // РћР±СЂР°Р±РѕС‚РєР° РІС‹Р±РѕСЂР° РјРѕРґРµР»Рё
  const handleModelSelect = () => {
    if (sel.model) {
      setIsModelSelected(true);
      setIsModelCollapsed(true); // РЎРІРѕСЂР°С‡РёРІР°РµРј Р±Р»РѕРє РјРѕРґРµР»РµР№
    }
  };

  // РћР±СЂР°Р±РѕС‚РєР° СЃР±СЂРѕСЃР° РІС‹Р±РѕСЂР°
  const handleResetSelection = () => {
    setIsModelSelected(false);
    setIsModelCollapsed(false); // Р Р°Р·РІРѕСЂР°С‡РёРІР°РµРј Р±Р»РѕРє РјРѕРґРµР»РµР№ РїСЂРё СЃР±СЂРѕСЃРµ
    setIsLoadingModels(false); // РЎР±СЂР°СЃС‹РІР°РµРј СЃРѕСЃС‚РѕСЏРЅРёРµ Р·Р°РіСЂСѓР·РєРё
    setSel((v) => {
      const newSel = resetDependentParams(v, 'style');
      newSel.style = undefined;
      return newSel;
    });
  };

  const selectedModelCard = useMemo(
    () => {
      return Array.isArray(models) ? models.find((m) => m.model === sel.model) || null : null;
    },
    [models, sel.model]
  );

  // РћРїС‚РёРјРёР·Р°С†РёСЏ: РјРµРјРѕРёР·РёСЂСѓРµРј РѕС‚С„РёР»СЊС‚СЂРѕРІР°РЅРЅС‹Рµ РјРѕРґРµР»Рё РґР»СЏ СЂРµРЅРґРµСЂРёРЅРіР°
  // РћРіСЂР°РЅРёС‡РёРІР°РµРј РєРѕР»РёС‡РµСЃС‚РІРѕ СЂРµРЅРґРµСЂРёСЂСѓРµРјС‹С… РєР°СЂС‚РѕС‡РµРє РґР»СЏ РѕРїС‚РёРјРёР·Р°С†РёРё РїСЂРѕРёР·РІРѕРґРёС‚РµР»СЊРЅРѕСЃС‚Рё
  const MAX_VISIBLE_MODELS = 100; // РњР°РєСЃРёРјР°Р»СЊРЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ РІРёРґРёРјС‹С… РјРѕРґРµР»РµР№

  const query = useMemo(() => {
    const q = new URLSearchParams();
    (["style", "model", "finish", "color", "type", "width", "height"] as const).forEach((k) => {
      const v = sel[k];
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return q;
  }, [sel]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        // РСЃРїРѕР»СЊР·СѓРµРј РґР°РЅРЅС‹Рµ РёР· РєСЌС€Р° РІРјРµСЃС‚Рѕ API Р·Р°РїСЂРѕСЃР°
        const cached = modelsCache.get('all');
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          const allModels = cached.data;
          const domain: Domain = {
            style: Array.from(new Set(allModels.map((m: ModelItem) => m.style))).sort(),
            finish: Array.from(new Set(allModels.flatMap((m: ModelItem) => (m as unknown as { options?: { finishes?: string[] } }).options?.finishes || []))).sort(),
            color: Array.from(new Set(allModels.flatMap((m: ModelItem) => (m as unknown as { options?: { colors?: string[] } }).options?.colors || []))).sort(),
            type: Array.from(new Set(allModels.flatMap((m: ModelItem) => (m as unknown as { options?: { types?: string[] } }).options?.types || []))).sort(),
            width: Array.from(new Set(allModels.flatMap((m: ModelItem) => (m as unknown as { options?: { widths?: number[] } }).options?.widths || []))).sort(),
            height: Array.from(new Set(allModels.flatMap((m: ModelItem) => (m as unknown as { options?: { heights?: number[] } }).options?.heights || []))).sort(),
            kits: [],
            handles: []
          };
          const response = { domain };
          if (!c && !sel.model) {
            setDomain(response.domain);
            clientLogger.debug('рџ”Ќ РљСЌС€РёСЂРѕРІР°РЅРЅС‹Р№ domain СѓСЃС‚Р°РЅРѕРІР»РµРЅ (РЅРµС‚ РІС‹Р±СЂР°РЅРЅРѕР№ РјРѕРґРµР»Рё)');
          } else {
            clientLogger.debug('рџ”Ќ РџСЂРѕРїСѓСЃРєР°РµРј СѓСЃС‚Р°РЅРѕРІРєСѓ РєСЌС€РёСЂРѕРІР°РЅРЅРѕРіРѕ domain - РІС‹Р±СЂР°РЅР° РјРѕРґРµР»СЊ:', sel.model);
          }
          return;
        }
        
        // Р—Р°РіСЂСѓР¶Р°РµРј domain С‚РѕР»СЊРєРѕ РµСЃР»Рё РѕРЅ РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅ
        if (!domain) {
          const response = await api.getOptions(query);
          // РР·РІР»РµРєР°РµРј domain РёР· РѕС‚РІРµС‚Р° API
          const domainData = (response?.domain || response) as Domain;
          // РќР• СѓСЃС‚Р°РЅР°РІР»РёРІР°РµРј domain РµСЃР»Рё СѓР¶Рµ РІС‹Р±СЂР°РЅР° РјРѕРґРµР»СЊ
          if (!c && !sel.model && domainData) {
            setDomain(domainData);
          }
        }
      } catch (e: unknown) {
        if (!c) setErr(e instanceof Error ? e.message : "РћС€РёР±РєР° РґРѕРјРµРЅРѕРІ");
      }
    })();
    return () => {
      c = true;
    };
  }, [CACHE_TTL, modelsCache, query, sel.model]); // Р”РѕР±Р°РІР»РµРЅС‹ Р·Р°РІРёСЃРёРјРѕСЃС‚Рё

  // РЎР±СЂРѕСЃ domain РїСЂРё СЃРјРµРЅРµ СЃС‚РёР»СЏ РёР»Рё РјРѕРґРµР»Рё
  useEffect(() => {
    if (!sel.model || !sel.style) {
      setDomain(null);
      return;
    }
  }, [sel.model, sel.style]);

  // Р›РѕРіРёСЂРѕРІР°РЅРёРµ РґР»СЏ РѕС‚Р»Р°РґРєРё РєРЅРѕРїРєРё "Р’С‹Р±СЂР°С‚СЊ"
  useEffect(() => {
    clientLogger.debug('рџ” РљРЅРѕРїРєР° Р’С‹Р±СЂР°С‚СЊ - СЃРѕСЃС‚РѕСЏРЅРёРµ:', { 
      hasModel: !!sel.model, 
      model: sel.model,
      isModelCollapsed,
      isModelSelected
    });
  }, [sel.model, isModelCollapsed, isModelSelected]);

  // РљР°СЃРєР°РґРЅР°СЏ Р·Р°РіСЂСѓР·РєР° РѕРїС†РёР№ РїСЂРё РёР·РјРµРЅРµРЅРёРё Р»СЋР±РѕРіРѕ РїР°СЂР°РјРµС‚СЂР° (СЃ РґРµР±Р°СѓРЅСЃРёРЅРіРѕРј)
  useEffect(() => {
    if (!sel.model || !sel.style) {
      return;
    }
    
    // Р”РµР±Р°СѓРЅСЃРёРЅРі РґР»СЏ РїСЂРµРґРѕС‚РІСЂР°С‰РµРЅРёСЏ С‡Р°СЃС‚С‹С… Р·Р°РїСЂРѕСЃРѕРІ
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
        if (!response.ok) {
          if (response.status === 500) {
            clientLogger.error('РћС€РёР±РєР° СЃРµСЂРІРµСЂР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ cascade-options:', response.status, response.statusText);
          } else {
            clientLogger.warn('РћС€РёР±РєР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ cascade-options:', response.status, response.statusText);
          }
          return;
        }
        let data: unknown;
        try {
          data = await response.json();
        } catch (jsonError) {
          clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° cascade-options:', jsonError);
          return;
        }
        
        const optionsData = data && typeof data === 'object' && data !== null && 'availableOptions' in data
          ? (data as { availableOptions: unknown }).availableOptions
          : null;
        if (!c && optionsData) {
          // РћР±РЅРѕРІР»СЏРµРј С‚РѕР»СЊРєРѕ РµСЃР»Рё РїРѕР»СѓС‡РёР»Рё РЅРѕРІС‹Рµ РґР°РЅРЅС‹Рµ
          setDomain(optionsData as Domain);
        }
      } catch (e: any) {
        clientLogger.error('вќЊ РћС€РёР±РєР° РєР°СЃРєР°РґРЅРѕР№ Р·Р°РіСЂСѓР·РєРё:', e);
        if (!c) setErr(e?.message ?? "РћС€РёР±РєР° РєР°СЃРєР°РґРЅРѕР№ Р·Р°РіСЂСѓР·РєРё");
      } finally {
        if (!c) setIsLoadingOptions(false);
      }
    })();
    }, 300); // Р”РµР±Р°СѓРЅСЃРёРЅРі 300ms
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [sel.model, sel.style, sel.finish, sel.color, sel.type, sel.width, sel.height]);

  // Р—Р°РіСЂСѓР·РєР° СЃС‚РѕРёРјРѕСЃС‚Рё РєСЂРѕРјРєРё РїСЂРё РёР·РјРµРЅРµРЅРёРё РїР°СЂР°РјРµС‚СЂРѕРІ (РІСЂРµРјРµРЅРЅРѕ РѕС‚РєР»СЋС‡РµРЅРѕ)
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
  //       clientLogger.error('вќЊ РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЃС‚РѕРёРјРѕСЃС‚Рё РєСЂРѕРјРєРё:', e);
  //       if (!c) setErr(e?.message ?? "РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЃС‚РѕРёРјРѕСЃС‚Рё РєСЂРѕРјРєРё");
  //     }
  //   })();
  //   return () => {
  //     c = true;
  //   };
  // }, [sel.model, sel.style, sel.finish, sel.color, sel.type, sel.width, sel.height]);

  // РћРїС‚РёРјРёР·РёСЂРѕРІР°РЅРЅР°СЏ Р·Р°РіСЂСѓР·РєР° РјРѕРґРµР»РµР№ Рё РѕРїС†РёР№ РїСЂРё РёР·РјРµРЅРµРЅРёРё СЃС‚РёР»СЏ
  // Р”РµР±Р°СѓРЅСЃРёСЂСѓРµРј СЃС‚РёР»СЊ РґР»СЏ РѕРїС‚РёРјРёР·Р°С†РёРё Р·Р°РіСЂСѓР·РєРё
  const debouncedStyle = useDebounce(sel.style, 300); // 300ms Р·Р°РґРµСЂР¶РєР°

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const styleKey = debouncedStyle || 'all';
        
        // РџСЂРѕРІРµСЂСЏРµРј РєР»РёРµРЅС‚СЃРєРёР№ РєСЌС€ РґР»СЏ РјРѕРґРµР»РµР№ СЃ РїСЂРѕРІРµСЂРєРѕР№ РІСЂРµРјРµРЅРё
        const cached = modelsCache.get('all');
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          clientLogger.debug('вњ… РСЃРїРѕР»СЊР·СѓРµРј РїСЂРµРґР·Р°РіСЂСѓР¶РµРЅРЅС‹Рµ РґР°РЅРЅС‹Рµ');
          
          // Р¤РёР»СЊС‚СЂСѓРµРј РјРѕРґРµР»Рё РїРѕ СЃС‚РёР»СЋ РІ РїР°РјСЏС‚Рё
          const filteredModels = debouncedStyle ? 
            cached.data.filter((model: any) => model.style === debouncedStyle) : 
            cached.data;
          
          setModels(filteredModels);
          setIsLoadingModels(false);
          return;
        }
        
        // Р•СЃР»Рё РЅРµС‚ РєСЌС€Р°, Р·Р°РіСЂСѓР¶Р°РµРј РґР°РЅРЅС‹Рµ
        clientLogger.debug('рџ”„ Р—Р°РіСЂСѓР¶Р°РµРј РґР°РЅРЅС‹Рµ РґР»СЏ СЃС‚РёР»СЏ:', debouncedStyle || 'РІСЃРµ');
        
        // РџСЂРѕРІРµСЂСЏРµРј, РЅРµ Р·Р°РіСЂСѓР¶Р°СЋС‚СЃСЏ Р»Рё СѓР¶Рµ РґР°РЅРЅС‹Рµ
        if (isLoadingModels) {
          clientLogger.debug('вЏёпёЏ Р”Р°РЅРЅС‹Рµ СѓР¶Рµ Р·Р°РіСЂСѓР¶Р°СЋС‚СЃСЏ, РїСЂРѕРїСѓСЃРєР°РµРј');
          return;
        }
        
        setIsLoadingModels(true);
        
        // РћРїС‚РёРјРёСЃС‚РёС‡РЅРѕРµ РѕР±РЅРѕРІР»РµРЅРёРµ: РїРѕРєР°Р·С‹РІР°РµРј РїСѓСЃС‚РѕР№ СЃРїРёСЃРѕРє СЃСЂР°Р·Сѓ
        if (!c) setModels([]);
        
        // РћРґРёРЅ РѕРїС‚РёРјРёР·РёСЂРѕРІР°РЅРЅС‹Р№ Р·Р°РїСЂРѕСЃ РґР»СЏ РІСЃРµС… РґР°РЅРЅС‹С…
        const response = await fetchWithAuth(`/api/catalog/doors/complete-data?style=${encodeURIComponent(debouncedStyle || "")}`);
        
        if (!c && response.ok) {
          let data: unknown;
          try {
            data = await response.json();
          } catch (jsonError) {
            clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° complete-data:', jsonError);
            setIsLoadingModels(false);
            return;
          }
          
          // РџСЂРѕРІРµСЂСЏРµРј С„РѕСЂРјР°С‚ РѕС‚РІРµС‚Р° apiSuccess
          const parsedData = parseApiResponse<{ models?: unknown[] }>(data);
          const rows = Array.isArray(parsedData && typeof parsedData === 'object' && 'models' in parsedData && parsedData.models)
            ? parsedData.models
            : (Array.isArray(parsedData) ? parsedData : []);
          
          // РџР°СЂР°Р»Р»РµР»СЊРЅР°СЏ Р·Р°РіСЂСѓР·РєР° С„РѕС‚Рѕ Рё domain РґР»СЏ РѕРїС‚РёРјРёР·Р°С†РёРё СЃРєРѕСЂРѕСЃС‚Рё
          if (rows.length > 0) {
            try {
              const modelNames = rows
                .filter((m: unknown): m is { model: string } => m && typeof m === 'object' && 'model' in m && typeof (m as { model: unknown }).model === 'string')
                .map((m) => m.model);
              
              // Р—Р°РіСЂСѓР¶Р°РµРј С„РѕС‚Рѕ Рё domain РїР°СЂР°Р»Р»РµР»СЊРЅРѕ
              const [photoResponse, domainResponse] = await Promise.all([
                fetchWithAuth('/api/catalog/doors/photos-batch', {
                  method: 'POST',
                  body: JSON.stringify({ models: modelNames })
                }),
                // Р—Р°РіСЂСѓР¶Р°РµРј domain С‚РѕР»СЊРєРѕ РµСЃР»Рё РѕРЅ РµС‰Рµ РЅРµ Р·Р°РіСЂСѓР¶РµРЅ
                !domain ? api.getOptions(query).catch(() => null) : Promise.resolve(null)
              ]);
              
              // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј domain РµСЃР»Рё РѕРЅ Р±С‹Р» Р·Р°РіСЂСѓР¶РµРЅ
              if (domainResponse && !domain) {
                try {
                  const domainData = domainResponse?.domain || domainResponse;
                  if (domainData && typeof domainData === 'object') {
                    setDomain(domainData as Domain);
                  }
                } catch (domainError) {
                  clientLogger.warn('РћС€РёР±РєР° РѕР±СЂР°Р±РѕС‚РєРё domain:', domainError);
                }
              }
              
              if (photoResponse.ok) {
                let photoData: unknown;
                try {
                  photoData = await photoResponse.json();
                } catch (jsonError) {
                  clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° photos-batch:', jsonError);
                  // РџСЂРѕРґРѕР»Р¶Р°РµРј Р±РµР· С„РѕС‚Рѕ
                  photoData = { photos: {} };
                }
                // РћР±СЉРµРґРёРЅСЏРµРј РґР°РЅРЅС‹Рµ РјРѕРґРµР»РµР№ СЃ С„РѕС‚Рѕ
                const parsedPhotoData = parseApiResponse<{ photos?: Record<string, { photo?: string; photos?: { cover?: string | null; gallery?: string[] } }> }>(photoData);
                const photoDataObj = parsedPhotoData && typeof parsedPhotoData === 'object' && 'photos' in parsedPhotoData && parsedPhotoData.photos && typeof parsedPhotoData.photos === 'object'
                  ? parsedPhotoData.photos
                  : {};
                const modelsWithPhotos = rows.map((model: unknown) => {
                  const modelObj = model && typeof model === 'object' && 'model' in model && typeof model.model === 'string'
                    ? model as { model: string; photo?: string | null; photos?: { cover: string | null; gallery: string[] }; [key: string]: unknown }
                    : { model: '' };
                  const photoInfo = modelObj.model && photoDataObj[modelObj.model] && typeof photoDataObj[modelObj.model] === 'object'
                    ? photoDataObj[modelObj.model] as { photo?: string; photos?: { cover?: string | null; gallery?: string[] } }
                    : null;
                  // РџСЂРёРѕСЂРёС‚РµС‚: photoInfo РёР· photos-batch, Р·Р°С‚РµРј modelObj РёР· complete-data
                  const finalPhotos = photoInfo?.photos || modelObj.photos;
                  const finalPhoto = photoInfo?.photo || modelObj.photo || null;
                  const finalHasGallery = photoInfo?.photos?.gallery && Array.isArray(photoInfo.photos.gallery) && photoInfo.photos.gallery.length > 0 
                    || (modelObj.photos?.gallery && Array.isArray(modelObj.photos.gallery) && modelObj.photos.gallery.length > 0)
                    || false;
                  
                  return {
                    ...modelObj,
                    photo: finalPhoto,
                    photos: finalPhotos,
                    hasGallery: finalHasGallery
                  };
                });
                
                setModels(modelsWithPhotos);
                
                // РЎРѕС…СЂР°РЅСЏРµРј РІ РєР»РёРµРЅС‚СЃРєРёР№ РєСЌС€ СЃ С„РѕС‚Рѕ
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
                
                // РЎРѕС…СЂР°РЅСЏРµРј РІ РєСЌС€ Р±РµР· С„РѕС‚Рѕ
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
              clientLogger.warn('вљ пёЏ РћС€РёР±РєР° batch Р·Р°РіСЂСѓР·РєРё С„РѕС‚Рѕ, РёСЃРїРѕР»СЊР·СѓРµРј РѕР±С‹С‡РЅСѓСЋ:', photoError);
              setModels(rows);
              
              // РЎРѕС…СЂР°РЅСЏРµРј РІ РєСЌС€ Р±РµР· С„РѕС‚Рѕ
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
            
            // РЎРѕС…СЂР°РЅСЏРµРј РІ РєСЌС€ Р±РµР· С„РѕС‚Рѕ
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
          clientLogger.error('вќЊ РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С…:', response.status);
          setIsLoadingModels(false);
        }
      } catch (error) {
        clientLogger.error('Error loading models and options:', error);
        if (!c) setIsLoadingModels(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [debouncedStyle, CACHE_TTL, isLoadingModels, modelsCache]); // РСЃРїРѕР»СЊР·СѓРµРј debouncedStyle РІРјРµСЃС‚Рѕ sel.style

  // Р”РµР±Р°СѓРЅСЃРёСЂСѓРµРј РїР°СЂР°РјРµС‚СЂС‹ РґР»СЏ СЂР°СЃС‡РµС‚Р° С†РµРЅС‹
  const debouncedSel = useDebounce(sel, 500); // 500ms Р·Р°РґРµСЂР¶РєР° РґР»СЏ СЂР°СЃС‡РµС‚Р° С†РµРЅС‹

  useEffect(() => {
    let c = false;
    (async () => {
      if (!hasBasic(debouncedSel)) {
        setPrice(null);
        return;
      }
      try {
        const p = await api.price(debouncedSel);
        
        // API СѓР¶Рµ РІРєР»СЋС‡Р°РµС‚ РєРѕРјРїР»РµРєС‚ С„СѓСЂРЅРёС‚СѓСЂС‹ Рё СЂСѓС‡РєСѓ РІ СЂР°СЃС‡РµС‚
        if (!c) {
          setPrice(p);
        }
      } catch (e: any) {
        if (!c) setErr(e?.message ?? "РћС€РёР±РєР° СЂР°СЃС‡С‘С‚Р°");
      }
    })();
    return () => {
      c = true;
    };
  }, [debouncedSel, hardwareKits, handles]);

  // РџСЂРµРґР·Р°РіСЂСѓР·РєР° РІСЃРµС… РґР°РЅРЅС‹С… РїСЂРё Р·Р°РіСЂСѓР·РєРµ СЃС‚СЂР°РЅРёС†С‹
  useEffect(() => {
    const preloadAllData = async () => {
      try {
        clientLogger.debug('рџљЂ РџСЂРµРґР·Р°РіСЂСѓР·РєР° РІСЃРµС… РґР°РЅРЅС‹С…...');
        
        const response = await fetchWithAuth('/api/catalog/doors/complete-data');
        if (response.ok) {
          let data: unknown;
          try {
            data = await response.json();
          } catch (jsonError) {
            clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° preload:', jsonError);
            return;
          }
          
          clientLogger.debug('вњ… Р’СЃРµ РґР°РЅРЅС‹Рµ РїСЂРµРґР·Р°РіСЂСѓР¶РµРЅС‹:', data);
          
          // РџСЂРѕРІРµСЂСЏРµРј С„РѕСЂРјР°С‚ РѕС‚РІРµС‚Р° apiSuccess
          const rows = Array.isArray(data && typeof data === 'object' && 'models' in data && data.models) 
            ? (data.models as unknown[]) 
            : (data && typeof data === 'object' && 'data' in data && data.data && typeof data.data === 'object' && 'models' in data.data && Array.isArray(data.data.models)
              ? (data.data.models as unknown[]) 
              : []);
          
          // Р—Р°РіСЂСѓР¶Р°РµРј С„РѕС‚Рѕ РґР»СЏ РІСЃРµС… РјРѕРґРµР»РµР№
          if (rows.length > 0) {
            try {
              const modelNames = rows
                .filter((m: unknown): m is { model: string } => m && typeof m === 'object' && 'model' in m && typeof (m as { model: unknown }).model === 'string')
                .map((m) => m.model);
              const photoResponse = await fetchWithAuth('/api/catalog/doors/photos-batch', {
                method: 'POST',
                body: JSON.stringify({ models: modelNames })
              });
              
              if (photoResponse.ok) {
                let photoData: unknown;
                try {
                  photoData = await photoResponse.json();
                } catch (jsonError) {
                  clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° photos-batch preload:', jsonError);
                  // РџСЂРѕРґРѕР»Р¶Р°РµРј Р±РµР· С„РѕС‚Рѕ
                  photoData = { photos: {} };
                }
                clientLogger.debug('вљЎ РџСЂРµРґР·Р°РіСЂСѓР·РєР° С„РѕС‚Рѕ Р·Р°РІРµСЂС€РµРЅР° РґР»СЏ', modelNames.length, 'РјРѕРґРµР»РµР№');
                
                // РћР±СЉРµРґРёРЅСЏРµРј РґР°РЅРЅС‹Рµ РјРѕРґРµР»РµР№ СЃ С„РѕС‚Рѕ
                const photoDataObj = photoData && typeof photoData === 'object' && 'photos' in photoData && photoData.photos && typeof photoData.photos === 'object'
                  ? photoData.photos as Record<string, unknown>
                  : {};
                const modelsWithPhotos = rows.map((model: unknown) => {
                  const modelObj = model && typeof model === 'object' && 'model' in model && typeof model.model === 'string'
                    ? model as { model: string; photo?: string | null; photos?: { cover: string | null; gallery: string[] }; [key: string]: unknown }
                    : { model: '' };
                  const photoInfo = modelObj.model && photoDataObj[modelObj.model] && typeof photoDataObj[modelObj.model] === 'object'
                    ? photoDataObj[modelObj.model] as { photo?: string; photos?: { cover?: string | null; gallery?: string[] } }
                    : null;
                  // РџСЂРёРѕСЂРёС‚РµС‚: photoInfo РёР· photos-batch, Р·Р°С‚РµРј modelObj РёР· complete-data
                  // Р•СЃР»Рё photoInfo РµСЃС‚СЊ, РёСЃРїРѕР»СЊР·СѓРµРј РµРіРѕ, РёРЅР°С‡Рµ РёСЃРїРѕР»СЊР·СѓРµРј modelObj.photos
                  const finalPhotos = photoInfo?.photos || modelObj.photos;
                  const finalPhoto = photoInfo?.photo || modelObj.photo || null;
                  const finalHasGallery = photoInfo?.photos?.gallery && Array.isArray(photoInfo.photos.gallery) && photoInfo.photos.gallery.length > 0 
                    || (modelObj.photos?.gallery && Array.isArray(modelObj.photos.gallery) && modelObj.photos.gallery.length > 0)
                    || false;
                  
                  return {
                    ...modelObj,
                    photo: finalPhoto,
                    photos: finalPhotos,
                    hasGallery: finalHasGallery
                  };
                });
                
                // РЎРѕС…СЂР°РЅСЏРµРј РІ РєСЌС€ СЃ С„РѕС‚Рѕ
                setModelsCache(prev => {
                  const newCache = new Map(prev);
                  newCache.set('all', {
                    data: modelsWithPhotos,
                    timestamp: Date.now()
                  });
                  return newCache;
                });
              } else {
                // РЎРѕС…СЂР°РЅСЏРµРј Р±РµР· С„РѕС‚Рѕ
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
              clientLogger.warn('вљ пёЏ РћС€РёР±РєР° РїСЂРµРґР·Р°РіСЂСѓР·РєРё С„РѕС‚Рѕ:', photoError);
              // РЎРѕС…СЂР°РЅСЏРµРј Р±РµР· С„РѕС‚Рѕ
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
        clientLogger.debug('вќЊ РћС€РёР±РєР° РїСЂРµРґР·Р°РіСЂСѓР·РєРё:', error);
      }
    };
    
    preloadAllData();
  }, []);

  // Р—Р°РіСЂСѓР¶Р°РµРј РґР°РЅРЅС‹Рµ С„СѓСЂРЅРёС‚СѓСЂС‹ РїР°СЂР°Р»Р»РµР»СЊРЅРѕ
  useEffect(() => {
    const loadHardwareData = async () => {
      try {
        // Р—Р°РіСЂСѓР¶Р°РµРј РєРѕРјРїР»РµРєС‚С‹ С„СѓСЂРЅРёС‚СѓСЂС‹ Рё СЂСѓС‡РєРё РїР°СЂР°Р»Р»РµР»СЊРЅРѕ
        const [kitsResponse, handlesResponse] = await Promise.all([
          fetchWithAuth('/api/catalog/hardware?type=kits'),
          fetchWithAuth('/api/catalog/hardware?type=handles')
        ]);
        
        // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј РєРѕРјРїР»РµРєС‚С‹ С„СѓСЂРЅРёС‚СѓСЂС‹
        if (kitsResponse.ok) {
          let kitsData: unknown;
          try {
            kitsData = await kitsResponse.json();
            const parsedKits = parseApiResponse<{ kits?: HardwareKit[] }>(kitsData);
            let kits: unknown[] = [];
            if (Array.isArray(parsedKits)) {
              kits = parsedKits;
            } else if (parsedKits && typeof parsedKits === 'object' && 'kits' in parsedKits && Array.isArray(parsedKits.kits)) {
              kits = parsedKits.kits;
            } else if (parsedKits && typeof parsedKits === 'object' && 'data' in parsedKits && Array.isArray((parsedKits as { data: unknown }).data)) {
              kits = (parsedKits as { data: unknown[] }).data;
            }
            if (Array.isArray(kits)) {
              setHardwareKits(kits as HardwareKit[]);
            } else {
              setHardwareKits([]);
            }
          } catch (jsonError) {
            clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° kits:', jsonError);
            setHardwareKits([]);
          }
        } else if (kitsResponse.status === 401) {
          clientLogger.warn('рџ”§ РќРµРѕР±С…РѕРґРёРјР° Р°РІС‚РѕСЂРёР·Р°С†РёСЏ РґР»СЏ Р·Р°РіСЂСѓР·РєРё РєРѕРјРїР»РµРєС‚РѕРІ С„СѓСЂРЅРёС‚СѓСЂС‹');
          setHardwareKits([]);
        }
        
        // РћР±СЂР°Р±Р°С‚С‹РІР°РµРј СЂСѓС‡РєРё
        if (handlesResponse.ok) {
          let handlesDataRaw: unknown;
          try {
            handlesDataRaw = await handlesResponse.json();
            const parsedHandles = parseApiResponse<{ handles?: Record<string, Handle[]> }>(handlesDataRaw);
            
            // РџСЂРѕРІРµСЂСЏРµРј С„РѕСЂРјР°С‚ РѕС‚РІРµС‚Р° - РјРѕР¶РµС‚ Р±С‹С‚СЊ РѕР±СЉРµРєС‚ РёР»Рё РјР°СЃСЃРёРІ
            let handlesData: Record<string, Handle[]>;
            if (Array.isArray(parsedHandles)) {
              handlesData = { default: parsedHandles as Handle[] };
            } else if (parsedHandles && typeof parsedHandles === 'object' && 'handles' in parsedHandles && parsedHandles.handles && typeof parsedHandles.handles === 'object' && !Array.isArray(parsedHandles.handles)) {
              handlesData = parsedHandles.handles as Record<string, Handle[]>;
            } else if (parsedHandles && typeof parsedHandles === 'object' && 'data' in parsedHandles && parsedHandles.data && typeof parsedHandles.data === 'object' && !Array.isArray(parsedHandles.data)) {
              handlesData = parsedHandles.data as Record<string, Handle[]>;
            } else if (parsedHandles && typeof parsedHandles === 'object' && !Array.isArray(parsedHandles)) {
              handlesData = parsedHandles as Record<string, Handle[]>;
            } else {
              handlesData = {};
            }
            setHandles(handlesData);
          } catch (jsonError) {
            clientLogger.error('РћС€РёР±РєР° РїР°СЂСЃРёРЅРіР° JSON РѕС‚РІРµС‚Р° handles:', jsonError);
            setHandles({});
          }
        } else if (handlesResponse.status === 401) {
          clientLogger.warn('рџ”§ РќРµРѕР±С…РѕРґРёРјР° Р°РІС‚РѕСЂРёР·Р°С†РёСЏ РґР»СЏ Р·Р°РіСЂСѓР·РєРё СЂСѓС‡РµРє');
          setHandles({});
        }
        
        // РЈСЃС‚Р°РЅР°РІР»РёРІР°РµРј Р±Р°Р·РѕРІС‹Рµ Р·РЅР°С‡РµРЅРёСЏ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ
        const kits = hardwareKits;
        const handlesData = handles;
        const basicKit = Array.isArray(kits) && kits.length > 0 
          ? kits.find((k: unknown): k is HardwareKit => k && typeof k === 'object' && 'isBasic' in k && (k as HardwareKit).isBasic === true) 
          : null;
        const handlesArray = Object.values(handlesData).flat();
        const basicHandle = Array.isArray(handlesArray) && handlesArray.length > 0
          ? handlesArray.find((h: Handle) => h && typeof h === 'object' && 'isBasic' in h && h.isBasic)
          : null;
        
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
          clientLogger.debug('рџ”§ РЈСЃС‚Р°РЅРѕРІР»РµРЅС‹ Р±Р°Р·РѕРІС‹Рµ Р·РЅР°С‡РµРЅРёСЏ:', { basicKit, basicHandle });
        }
        
      } catch (error) {
        clientLogger.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РґР°РЅРЅС‹С… С„СѓСЂРЅРёС‚СѓСЂС‹:', error);
      }
    };
    
    loadHardwareData();
  }, []);

  // РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРѕРµ СЃРІРѕСЂР°С‡РёРІР°РЅРёРµ Р±Р»РѕРєР° СЃС‚РёР»РµР№ РїСЂРё РІС‹Р±РѕСЂРµ СЃС‚РёР»СЏ + РјРіРЅРѕРІРµРЅРЅР°СЏ С„РёР»СЊС‚СЂР°С†РёСЏ
  useEffect(() => {
    if (sel.style) {
      setIsStyleCollapsed(true);
      // РЎР±СЂР°СЃС‹РІР°РµРј СЃРѕСЃС‚РѕСЏРЅРёРµ СЃРІРѕСЂР°С‡РёРІР°РЅРёСЏ РјРѕРґРµР»РµР№ РїСЂРё СЃРјРµРЅРµ СЃС‚РёР»СЏ
      setIsModelCollapsed(false);
      
      // РњРіРЅРѕРІРµРЅРЅР°СЏ С„РёР»СЊС‚СЂР°С†РёСЏ РёР· РєСЌС€Р°
      const cached = modelsCache.get('all');
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        clientLogger.debug('вљЎ РњРіРЅРѕРІРµРЅРЅР°СЏ С„РёР»СЊС‚СЂР°С†РёСЏ РґР»СЏ СЃС‚РёР»СЏ:', sel.style);
        const filteredModels = cached.data.filter((model: any) => model.style === sel.style);
        setModels(filteredModels);
        setIsLoadingModels(false);
      }
    } else {
      // Р•СЃР»Рё СЃС‚РёР»СЊ РЅРµ РІС‹Р±СЂР°РЅ, СЂР°Р·РІРѕСЂР°С‡РёРІР°РµРј Р±Р»РѕРє СЃС‚РёР»РµР№
      setIsStyleCollapsed(false);
      setIsModelCollapsed(false);
    }
  }, [sel.style, modelsCache, CACHE_TTL]); // Р”РѕР±Р°РІР»РµРЅР° Р·Р°РІРёСЃРёРјРѕСЃС‚СЊ CACHE_TTL


  // РџСЂРµС„РёР»Р» РїРѕ ?sku=...
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
    
    // Р”РѕР±Р°РІР»СЏРµРј РґРІРµСЂСЊ СЃ РєРѕРјРїР»РµРєС‚РѕРј
    const item: CartItem = {
      id: uid(),
      type: 'door', // РЈРєР°Р·С‹РІР°РµРј С‚РёРї С‚РѕРІР°СЂР°
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
      hardwareKitName: sel.hardware_kit && Array.isArray(hardwareKits) && hardwareKits.length > 0 
        ? findHardwareKitById(hardwareKits, sel.hardware_kit?.id)?.name 
        : undefined, // Р”РѕР±Р°РІР»СЏРµРј РЅР°Р·РІР°РЅРёРµ РєРѕРјРїР»РµРєС‚Р°
      baseAtAdd: price.total,
    };
    
    const newCart = [...cart, item];
    
    // Р•СЃР»Рё РІС‹Р±СЂР°РЅР° СЂСѓС‡РєР°, РґРѕР±Р°РІР»СЏРµРј РµС‘ РѕС‚РґРµР»СЊРЅРѕР№ СЃС‚СЂРѕРєРѕР№
    if (sel.handle && sel.handle.id) {
      const handle = findHandleById(handles, sel.handle!.id);
      const handleItem: CartItem = {
        id: uid(),
        type: 'handle', // РЈРєР°Р·С‹РІР°РµРј С‚РёРї С‚РѕРІР°СЂР°
        style: sel.style,
        model: sel.model,
        finish: sel.finish,
        width: sel.width,
        height: sel.height,
        color: sel.color,
        qty: quantity,
        unitPrice: handle ? handle.price : 0,
        handleId: sel.handle.id,
        handleName: handle ? handle.name : 'РќРµРёР·РІРµСЃС‚РЅР°СЏ СЂСѓС‡РєР°', // Р”РѕР±Р°РІР»СЏРµРј РЅР°Р·РІР°РЅРёРµ СЂСѓС‡РєРё
        sku_1c: price.sku_1c,
        baseAtAdd: 0,
      };
      newCart.push(handleItem);
    }
    
    setCart(newCart);
    
    // РЎРѕС…СЂР°РЅСЏРµРј РёСЃС…РѕРґРЅС‹Рµ С†РµРЅС‹ РґР»СЏ РЅРѕРІС‹С… С‚РѕРІР°СЂРѕРІ
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
    
    // РСЃРїРѕР»СЊР·СѓРµРј РґР°РЅРЅС‹Рµ РёР· РєСЌС€Р°
    const cached = modelsCache.get('all');
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      const allModels = cached.data;
      const modelData = allModels.find((m: ModelItem) => m.model === item.model);
      if (modelData) {
        const modelWithOptions = modelData as ModelItem & { options?: { finishes?: string[]; colors?: string[]; types?: string[]; widths?: number[]; heights?: number[] } };
        const domain: Partial<Domain> = {
          finish: modelWithOptions.options?.finishes || [],
          color: modelWithOptions.options?.colors || [],
          type: modelWithOptions.options?.types || [],
          width: modelWithOptions.options?.widths || [],
          height: modelWithOptions.options?.heights || []
        };
        setItemDomains((m) => ({ ...m, [item.model]: domain }));
        return domain;
      }
    }
    
    // Fallback Рє СЃС‚Р°СЂРѕРјСѓ API
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
    "model": "РњРѕРґРµР»СЊ",
    "style": "РЎС‚РёР»СЊ",
    "finish": "РџРѕРєСЂС‹С‚РёРµ",
    "domeo_color": "Р¦РІРµС‚",
    "type": "РўРёРї",
    "width": "РЁРёСЂРёРЅР°",
    "height": "Р’С‹СЃРѕС‚Р°",
    "rrc_price": "Р Р Р¦",
    "photo_url": "Р¤РѕС‚Рѕ"
  },
  "uniqueBy": ["model","finish","domeo_color","type","width","height"],
  "sheet": "РљР°С‚Р°Р»РѕРі",
  "startRow": 2
}`;
  const [mappingText, setMappingText] = useState<string>(DEFAULT_MAPPING);
  const [importInfo, setImportInfo] =
    useState<null | { ok: boolean; status: number; body?: any }>(null);

  const [modelForPhoto, setModelForPhoto] = useState("");
  const [mediaInfo, setMediaInfo] =
    useState<null | { ok: boolean; status: number; body?: any }>(null);

  // РІРѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ С‚РѕРєРµРЅ РёР· localStorage
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
      setOut("Р’РІРµРґРёС‚Рµ РєРѕСЂСЂРµРєС‚РЅС‹Р№ email");
      return;
    }
    if (password.length < 6) {
      setOut("РџР°СЂРѕР»СЊ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РЅРµ РєРѕСЂРѕС‡Рµ 6 СЃРёРјРІРѕР»РѕРІ");
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
      setOut("РЈРєР°Р¶РёС‚Рµ email Рё РїР°СЂРѕР»СЊ");
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
    setOut("Р’С‹С€Р»Рё РёР· Р°РєРєР°СѓРЅС‚Р°");
  };

  const importPrice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const fileInput =
      (form.elements.namedItem("price") as HTMLInputElement | null) ?? null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setOut("Р’С‹Р±РµСЂРёС‚Рµ С„Р°Р№Р»");
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
      setOut("Р’С‹Р±РµСЂРёС‚Рµ С„Р°Р№Р»(С‹)");
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

  // Р¤СѓРЅРєС†РёРё РґР»СЏ СЂР°СЃС‡РµС‚Р° РґРµР»СЊС‚ (С‚РѕР»СЊРєРѕ РґР»СЏ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ) - СѓРґР°Р»РµРЅС‹, РґРµР»СЊС‚Р° РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ С‚РѕР»СЊРєРѕ РІ РјРµРЅРµРґР¶РµСЂРµ РєРѕСЂР·РёРЅС‹

  // Р¤СѓРЅРєС†РёРё РіРµРЅРµСЂР°С†РёРё РґРѕРєСѓРјРµРЅС‚РѕРІ
  const generateDocument = async (type: 'quote' | 'invoice' | 'order') => {
    if (cart.length === 0) {
      alert('РљРѕСЂР·РёРЅР° РїСѓСЃС‚Р°');
      return;
    }

    if (!selectedClient) {
      setShowClientManager(true);
      return;
    }

    try {
      const response = await fetchWithAuth('/api/documents/generate', {
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
            hardwareKitName: item.hardwareKitId && Array.isArray(hardwareKits) && hardwareKits.length > 0 
              ? findHardwareKitById(hardwareKits, item.hardwareKitId)?.name 
              : item.hardwareKitName || undefined,
            handleId: item.handleId,
            handleName: item.handleName,
            type: item.type || (item.handleId ? 'handle' : 'door'), // Р’РђР–РќРћ: РЎРѕС…СЂР°РЅСЏРµРј type
            description: item.handleId ? findHandleById(handles, item.handleId)?.name : undefined
          })),
          totalAmount: cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
        })
      });

      if (response.ok) {
        // Р”Р»СЏ РІСЃРµС… С‚РёРїРѕРІ РґРѕРєСѓРјРµРЅС‚РѕРІ СЃРєР°С‡РёРІР°РµРј С„Р°Р№Р»С‹
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        if (type === 'order') {
          a.download = `Р—Р°РєР°Р·_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
          a.download = `${type === 'quote' ? 'РљРџ' : 'РЎС‡РµС‚'}_${new Date().toISOString().split('T')[0]}.pdf`;
        }
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('РћС€РёР±РєР° РїСЂРё РіРµРЅРµСЂР°С†РёРё РґРѕРєСѓРјРµРЅС‚Р°');
      }
    } catch (error) {
      clientLogger.error('Error generating document:', error);
      alert('РћС€РёР±РєР° РїСЂРё РіРµРЅРµСЂР°С†РёРё РґРѕРєСѓРјРµРЅС‚Р°');
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
              <span className="text-black text-lg font-bold">вЂў</span>
              <span className="text-lg font-semibold text-black">Doors</span>
            </div>
            <nav className="flex items-center space-x-4 justify-end flex-shrink-0 ml-auto">
              {isAuthenticated && <NotificationBell userRole={user?.role || "executor"} />}
              <Link 
                href="/" 
                className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
              >
              в†ђ РљР°С‚РµРіРѕСЂРёРё
            </Link>
            {isAuthenticated && (
              <button
                onClick={() => setShowClientManager(true)}
                className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
              >
                рџ‘¤ {selectedClientName || 'Р—Р°РєР°Р·С‡РёРє'}
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
                РђРґРјРёРЅ
              </button>
            )}
            
            
            <button
              onClick={() => {
                // РЎРѕС…СЂР°РЅСЏРµРј С‚РµРєСѓС‰РёРµ С†РµРЅС‹ РєР°Рє Р±Р°Р·РѕРІС‹Рµ РґР»СЏ СЂР°СЃС‡РµС‚Р° РґРµР»СЊС‚С‹
                const basePrices: Record<string, number> = {};
                cart.forEach(item => {
                  basePrices[item.id] = item.unitPrice;
                });
                setCartManagerBasePrices(basePrices);
                setShowCartManager(true);
              }}
              className="flex items-center space-x-2 px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-all duration-200 text-sm"
            >
              <span>рџ›’</span>
              <span>РљРѕСЂР·РёРЅР°</span>
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
            <DoorFilters
              sel={sel}
              setSel={setSel}
              isStyleCollapsed={isStyleCollapsed}
              setIsStyleCollapsed={setIsStyleCollapsed}
              isLoadingModels={isLoadingModels}
              setIsModelSelected={setIsModelSelected}
              setIsModelCollapsed={setIsModelCollapsed}
              setIsLoadingModels={setIsLoadingModels}
            />

            <DoorList
              sel={sel}
              setSel={setSel}
              models={models}
              isLoadingModels={isLoadingModels}
              isModelCollapsed={isModelCollapsed}
              setIsModelCollapsed={setIsModelCollapsed}
              selectedModelCard={selectedModelCard}
              MAX_VISIBLE_MODELS={MAX_VISIBLE_MODELS}
            />

            {/* Р‘Р»РѕРє РІС‹Р±РѕСЂР° РїР°СЂР°РјРµС‚СЂРѕРІ - РїРѕСЏРІР»СЏРµС‚СЃСЏ РїРѕСЃР»Рµ СЃРІРѕСЂР°С‡РёРІР°РЅРёСЏ РјРѕРґРµР»РµР№ */}
            {sel.model && isModelSelected && isModelCollapsed && (
              <DoorConfiguration
                sel={sel}
                setSel={setSel}
                domain={domain}
                hardwareKits={hardwareKits}
                handles={handles}
                price={price}
                selectedModelCard={selectedModelCard}
                isLoadingOptions={isLoadingOptions}
                showHandleInfo={showHandleInfo}
                setShowHandleInfo={setShowHandleInfo}
                setShowHandleModal={setShowHandleModal}
                handleAddToCartClick={handleAddToCartClick}
                kpHtml={kpHtml}
                setKpHtml={setKpHtml}
              />
            )}

          </main>

          {/* Р¦РµРЅС‚СЂР°Р»СЊРЅР°СЏ СЃРµРєС†РёСЏ - РїСЂРµРІСЊСЋ РјРѕРґРµР»Рё */}
          <DoorPreview
            sel={sel}
            selectedModelCard={selectedModelCard}
            hideSidePanels={hideSidePanels}
            setHideSidePanels={setHideSidePanels}
            handleModelSelect={handleModelSelect}
          />

          <DoorSidebar
            sel={sel}
            selectedModelCard={selectedModelCard}
            hardwareKits={hardwareKits}
            handles={handles}
            cart={cart}
            selectedClientName={selectedClientName}
            hideSidePanels={hideSidePanels}
          />
        </div>
      )}

      {tab === "admin" && (
        <div className="max-w-3xl mx_auto p-6 space-y-8">
          <section className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">Р РµРіРёСЃС‚СЂР°С†РёСЏ / Р’С…РѕРґ</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded"
                />
              </label>
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
                РџР°СЂРѕР»СЊ
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="вЂўвЂўвЂўвЂўвЂўвЂўвЂўвЂў"
                />
              </label>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleLogin}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Р’РѕР№С‚Рё
              </button>
              <button
                onClick={handleRegister}
                className="px-4 py-2 border border-black rounded hover:bg-gray-50"
              >
                Р РµРіРёСЃС‚СЂР°С†РёСЏ
              </button>
            </div>
          </section>
        </div>
      )}

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
          setCartManagerBasePrices={setCartManagerBasePrices}
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

      {/* РњРµРЅРµРґР¶РµСЂ Р·Р°РєР°Р·С‡РёРєРѕРІ */}
      {showClientManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[96vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-black">РњРµРЅРµРґР¶РµСЂ Р·Р°РєР°Р·С‡РёРєРѕРІ</h2>
              <button
                onClick={() => setShowClientManager(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                Г—
              </button>
            </div>

            {/* Content: С‚РѕР»СЊРєРѕ РїРѕРёСЃРє + РєРЅРѕРїРєР° "+" РґР»СЏ СЃРѕР·РґР°РЅРёСЏ */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">РџРѕРёСЃРє</h3>
                <button
                  onClick={() => setShowCreateClientForm(true)}
                  className="px-3 py-2 text-sm border border-black text-black hover:bg-black hover:text-white rounded transition-all duration-200"
                >
                  + РќРѕРІС‹Р№ Р·Р°РєР°Р·С‡РёРє
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="РџРѕРёСЃРє РїРѕ Р¤РРћ, С‚РµР»РµС„РѕРЅСѓ, Р°РґСЂРµСЃСѓ..."
                  value={clientSearchInput}
                  onChange={(e) => setClientSearchInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {clientsLoading ? (
                    <div className="p-4 text-center text-gray-500">Р—Р°РіСЂСѓР·РєР° РєР»РёРµРЅС‚РѕРІ...</div>
                  ) : clients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">РљР»РёРµРЅС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹</div>
                  ) : (
                    clients
                      .filter((c) => {
                        if (!clientSearch) return true;
                        const hay = `${c.lastName} ${c.firstName} ${c.middleName ?? ''} ${c.phone ?? ''} ${c.address ?? ''}`.toLowerCase();
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
                          <div className="grid items-center gap-3" style={{gridTemplateColumns: '5fr 3fr 7fr'}}>
                            <div className="font-medium truncate">
                              {client.lastName} {client.firstName}{client.middleName ? ` ${client.middleName}` : ''}
                            </div>
                            <div className="text-sm text-gray-600 truncate">{formatPhone(client.phone as any)}</div>
                            <div className="text-sm text-gray-600 overflow-hidden" style={{display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>
                              {client.address || 'вЂ”'}
                            </div>
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
                  РћС‚РјРµРЅР°
                </button>
                <button
                  onClick={() => {
                    if (selectedClient) {
                      setShowClientManager(false);
                    } else {
                      alert('РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РІС‹Р±РµСЂРёС‚Рµ РєР»РёРµРЅС‚Р° РёР· СЃРїРёСЃРєР°');
                    }
                  }}
                  disabled={!selectedClient}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Р’С‹Р±СЂР°С‚СЊ РєР»РёРµРЅС‚Р°
                </button>
              </div>
            </div>

            {/* РњРѕРґР°Р»РєР° СЃРѕР·РґР°РЅРёСЏ РєР»РёРµРЅС‚Р° */}
            <CreateClientModal
              isOpen={showCreateClientForm}
              onClose={() => setShowCreateClientForm(false)}
              onClientCreated={(client) => {
                setSelectedClient(client.id);
                setSelectedClientName(`${client.firstName} ${client.lastName}`);
                fetchClients(); // РћР±РЅРѕРІР»СЏРµРј СЃРїРёСЃРѕРє РєР»РёРµРЅС‚РѕРІ
              }}
            />
          </div>
        </div>
      )}

      {/* РњРµРЅРµРґР¶РµСЂ Р·Р°РєР°Р·С‡РёРєРѕРІ */}
      {showClientManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[96vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-black">РњРµРЅРµРґР¶РµСЂ Р·Р°РєР°Р·С‡РёРєРѕРІ</h2>
              <button
                onClick={() => setShowClientManager(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                Г—
              </button>
            </div>

            {/* Content: С‚РѕР»СЊРєРѕ РїРѕРёСЃРє + РєРЅРѕРїРєР° "+" РґР»СЏ СЃРѕР·РґР°РЅРёСЏ */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-black">РџРѕРёСЃРє</h3>
                <button
                  onClick={() => setShowCreateClientForm(true)}
                  className="px-3 py-2 text-sm border border-black text-black hover:bg-black hover:text-white rounded transition-all duration-200"
                >
                  + РќРѕРІС‹Р№ Р·Р°РєР°Р·С‡РёРє
                </button>
              </div>

                  <div className="space-y-4">
                    <input
                      type="text"
                  placeholder="РџРѕРёСЃРє РїРѕ Р¤РРћ, С‚РµР»РµС„РѕРЅСѓ, Р°РґСЂРµСЃСѓ..."
                  value={clientSearchInput}
                  onChange={(e) => setClientSearchInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {clientsLoading ? (
                    <div className="p-4 text-center text-gray-500">Р—Р°РіСЂСѓР·РєР° РєР»РёРµРЅС‚РѕРІ...</div>
                      ) : clients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">РљР»РёРµРЅС‚С‹ РЅРµ РЅР°Р№РґРµРЅС‹</div>
                  ) : (
                    clients
                      .filter((c) => {
                        if (!clientSearch) return true;
                        const hay = `${c.lastName} ${c.firstName} ${c.middleName ?? ''} ${c.phone ?? ''} ${c.address ?? ''}`.toLowerCase();
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
                        <div className="grid items-center gap-3" style={{gridTemplateColumns: '5fr 3fr 7fr'}}>
                          <div className="font-medium truncate">
                            {client.lastName} {client.firstName}{client.middleName ? ` ${client.middleName}` : ''}
                          </div>
                          <div className="text-sm text-gray-600 truncate">{formatPhone(client.phone as any)}</div>
                          <div className="text-sm text-gray-600 overflow-hidden" style={{display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical'}}>
                            {client.address || 'вЂ”'}
                          </div>
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
                  РћС‚РјРµРЅР°
                </button>
                <button
                  onClick={() => {
                    if (selectedClient) {
                      setShowClientManager(false);
                    } else {
                      alert('РџРѕР¶Р°Р»СѓР№СЃС‚Р°, РІС‹Р±РµСЂРёС‚Рµ РєР»РёРµРЅС‚Р° РёР· СЃРїРёСЃРєР°');
                    }
                  }}
                  disabled={!selectedClient}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Р’С‹Р±СЂР°С‚СЊ РєР»РёРµРЅС‚Р°
                </button>
                  </div>
                </div>

            {/* РњРѕРґР°Р»РєР° СЃРѕР·РґР°РЅРёСЏ РєР»РёРµРЅС‚Р° */}
            <CreateClientModal
              isOpen={showCreateClientForm}
              onClose={() => setShowCreateClientForm(false)}
              onClientCreated={(client) => {
                setSelectedClient(client.id);
                setSelectedClientName(`${client.firstName} ${client.lastName}`);
                fetchClients(); // РћР±РЅРѕРІР»СЏРµРј СЃРїРёСЃРѕРє РєР»РёРµРЅС‚РѕРІ
              }}
            />
              </div>
        </div>
      )}

      {/* РњРѕРґР°Р»СЊРЅРѕРµ РѕРєРЅРѕ РІС‹Р±РѕСЂР° СЂСѓС‡РµРє */}
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

// CartManager теперь импортируется из @/components/doors
// Компонент CartItemEditor удален - редактирование теперь инлайн в CartManager
// Компоненты DoorCard, StickyPreview, Select, HardwareSelect, HandleSelect, SelectMini
// теперь импортируются из @/components/doors

