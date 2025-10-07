// Domeo • Doors • Configurator + Cart (styles→models→params, auto-pricing) — 2025‑09‑12
// Requirements applied:
//  - Top: Styles (sketch images we provide) → then Models grid (photos from server) → then Params
//  - Auto pricing (no explicit "Рассчитать" button). Recalculates immediately on selection changes
//  - Right sidebar: Cart + Selected parameters (as on the reference screenshot)
//  - "Завершить образ" renamed to "Выбор фурнитуры и ручек" with two sections: Фурнитура (kits) and Ручка (handles)
//  - Exports: КП (HTML), Счёт (HTML), Заказ на фабрику (CSV). Front-only; if VITE_API_URL is set, calls backend endpoints.

import React, { useEffect, useMemo, useState } from 'react'

// -----------------------------
// Types
// -----------------------------
export type Domain = {
  style: string[]
  model: string[]
  finish: string[]
  color: string[]
  type: string[]
  width: number[]
  height: number[]
  kits: { id: string; name: string; group: number; price_rrc: number }[]
  handles: { id: string; name: string; supplier_name: string; supplier_sku: string; price_opt: number; price_rrc: number; price_group_multiplier: number }[]
}

export type Selection = {
  style?: string
  model?: string
  finish?: string
  color?: string
  type?: string
  width?: number
  height?: number
  hardware_kit?: { id: string } | undefined
  handle?: { id: string } | undefined
}

export type PriceResp = {
  ok: boolean
  currency: string
  base: number
  breakdown: { label: string; amount: number }[]
  total: number
}

type ModelCard = { model: string; style: string; photo: string }

type CartItem = {
  id: string
  model: string
  width: number
  height: number
  color?: string
  qty: number
  unitPrice: number
  handleId?: string
}

// -----------------------------
// Helpers
// -----------------------------
const fmtInt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const hasBasic = (s: Selection) => !!(s.model && s.finish && s.color && s.type && s.width && s.height)
const uid = () => Math.random().toString(36).slice(2, 9)

// -----------------------------
// API layer: real (fetch) or mock (in-browser)
// -----------------------------
const API = (import.meta as any).env?.VITE_API_URL as string | undefined

// Sketch placeholders for styles (SVG-like via CSS). Replace with real SVGs from /static/doors/styles when available
const styleTiles: { key: string; bg: string }[] = [
  { key: 'Скрытая', bg: 'linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)' },
  { key: 'Современная', bg: 'linear-gradient(135deg,#e5f0ff 0%,#e0e7ff 100%)' },
  { key: 'Неоклассика', bg: 'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)' },
  { key: 'Классика', bg: 'linear-gradient(135deg,#fef9c3 0%,#fde68a 100%)' },
]

// Mock dataset
const mockData = {
  products: [
    { model: 'PG Base 1', modelPhoto: '/media/doors/pg-base-1.jpg', style: 'Современная', finish: 'Нанотекс', color: 'Белый', type: 'Распашная', width: 800, height: 2000, rrc_price: 21280 },
    { model: 'PO Base 1/1', modelPhoto: '/media/doors/po-base-1-1.jpg', style: 'Современная', finish: 'Нанотекс', color: 'Белый', type: 'Распашная', width: 800, height: 2000, rrc_price: 22900 },
    { model: 'PO Base 1/2', modelPhoto: '/media/doors/po-base-1-2.jpg', style: 'Современная', finish: 'Нанотекс', color: 'Белый', type: 'Распашная', width: 900, height: 2000, rrc_price: 23900 },
    { model: 'Neo-1', modelPhoto: '/media/doors/neo1.jpg', style: 'Неоклассика', finish: 'Эмаль', color: 'Слоновая кость', type: 'Распашная', width: 800, height: 2000, rrc_price: 27900 },
  ],
  kits: [
    { id: 'KIT_STD', name: 'Базовый комплект', group: 1, price_rrc: 5000 },
    { id: 'KIT_SOFT', name: 'SoftClose', group: 2, price_rrc: 2400 },
  ],
  handles: [
    { id: 'HNDL_PRO', name: 'Pro', supplier_name: 'HandleCo', supplier_sku: 'H-PRO', price_opt: 900, price_rrc: 1200, price_group_multiplier: 1.15 },
    { id: 'HNDL_SIL', name: 'Silver', supplier_name: 'HandleCo', supplier_sku: 'H-SIL', price_opt: 1100, price_rrc: 1400, price_group_multiplier: 1.15 },
  ],
}

const mockApi = {
  async getOptions(query: URLSearchParams) {
    const q = Object.fromEntries(query.entries()) as Record<string, string>
    const filtered = mockData.products.filter(p => Object.entries(q).every(([k, v]) => !v || String((p as any)[k]) === String(v)))
    const domain: Domain = {
      style: Array.from(new Set((q.style ? filtered : mockData.products).map(p => p.style))).sort(),
      model: Array.from(new Set(filtered.map(p => p.model))).sort(),
      finish: Array.from(new Set(filtered.map(p => p.finish))).sort(),
      color: Array.from(new Set(filtered.map(p => p.color))).sort(),
      type: Array.from(new Set(filtered.map(p => p.type))).sort(),
      width: Array.from(new Set(filtered.map(p => p.width))).sort((a, b) => a - b),
      height: Array.from(new Set(filtered.map(p => p.height))).sort((a, b) => a - b),
      kits: mockData.kits,
      handles: mockData.handles,
    }
    return { ok: true, domain }
  },
  async listModelsByStyle(style?: string): Promise<ModelCard[]> {
    const rows = mockData.products.filter(p => !style || p.style === style)
    const seen = new Set<string>()
    const models = rows.filter(p => { if (seen.has(p.model)) return false; seen.add(p.model); return true })
    return models.map(p => ({ model: p.model, style: p.style, photo: p.modelPhoto }))
  },
  async price(selection: Selection): Promise<PriceResp> {
    const p = mockData.products.find(x => x.model === selection.model && x.finish === selection.finish && x.color === selection.color && x.type === selection.type && x.width === selection.width && x.height === selection.height)
    if (!p) throw new Error('Combination not found')
    const kit = selection.hardware_kit?.id ? mockData.kits.find(k => k.id === selection.hardware_kit!.id) : undefined
    const handle = selection.handle?.id ? mockData.handles.find(h => h.id === selection.handle!.id) : undefined
    const base = p.rrc_price
    const addKit = kit?.price_rrc ?? 0
    const addHandle = handle?.price_rrc ?? 0
    const total = Math.round(base + addKit + addHandle)
    return { ok: true, currency: 'RUB', base, breakdown: [
      { label: 'Base RRC', amount: base },
      ...(kit ? [{ label: `Комплект: ${kit.name}`, amount: kit.price_rrc }] : []),
      ...(handle ? [{ label: `Ручка: ${handle.name}`, amount: handle.price_rrc }] : []),
    ], total }
  },
  async kp(cart: { items: CartItem[] }): Promise<string> {
    const rows: string[] = []
    let n = 1
    for (const it of cart.items) {
      const nameCore = `${it.model} (${it.width}×${it.height}${it.color ? `, ${it.color}` : ''})`
      const sum = it.unitPrice * it.qty
      rows.push(`<tr><td>${n}</td><td>${nameCore}</td><td class="num">${fmtInt(it.unitPrice)}</td><td class="num">${it.qty}</td><td class="num">${fmtInt(sum)}</td></tr>`)
      if (it.handleId) {
        const h = mockData.handles.find(h => h.id === it.handleId)
        if (h) {
          const hSum = h.price_rrc * it.qty
          rows.push(`<tr class="sub"><td></td><td>Ручка: ${h.name} — ${fmtInt(h.price_rrc)} × ${it.qty} = ${fmtInt(hSum)}</td><td class="num">${fmtInt(h.price_rrc)}</td><td class="num">${it.qty}</td><td class="num">${fmtInt(hSum)}</td></tr>`)
        }
      }
      n++
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
      <tbody>${rows.join('')}</tbody></table></body></html>`
  },
  async invoice(cart: { items: CartItem[]; customer?: { name?: string; inn?: string } }): Promise<string> {
    const total = cart.items.reduce((s, i) => s + i.unitPrice * i.qty, 0)
    return `<!doctype html><html><head><meta charset="utf-8"/><style>
      body{font-family:ui-sans-serif,system-ui}
      .row{display:flex;justify-content:space-between}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#f6f6f6;text-align:left}
      td.num{text-align:right}
    </style></head><body>
      <h1>Счет на оплату</h1>
      <div class="row"><div>Покупатель: ${cart.customer?.name || '—'}</div><div>ИНН: ${cart.customer?.inn || '—'}</div></div>
      <table><thead><tr><th>Наименование</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>
        ${cart.items.map(i=>`<tr><td>${i.model} (${i.width}×${i.height}${i.color?`, ${i.color}`:''})</td><td class="num">${i.qty}</td><td class="num">${fmtInt(i.unitPrice)}</td><td class="num">${fmtInt(i.unitPrice*i.qty)}</td></tr>`).join('')}
      </tbody></table>
      <h3>Итого: ${fmtInt(total)} ₽</h3>
    </body></html>`
  },
  async factory(cart: { items: CartItem[] }): Promise<string> {
    const header = ['SKU','Model','Width','Height','Color','Qty','UnitPrice','Sum']
    const lines = cart.items.map(i=>[
      `${i.model}-${i.width}x${i.height}-${i.color||''}`,
      i.model,
      i.width,
      i.height,
      i.color||'',
      i.qty,
      i.unitPrice,
      i.unitPrice*i.qty,
    ])
    return [header.join(','), ...lines.map(r=>r.join(','))].join('\n')
  },
}

const realApi = {
  async getOptions(query: URLSearchParams) {
    const r = await fetch(`${API}/catalog/doors/options?${query.toString()}`)
    if (!r.ok) throw new Error(`options HTTP ${r.status}`)
    return r.json()
  },
  async listModelsByStyle(style?: string): Promise<ModelCard[]> {
    const r = await fetch(`${API}/catalog/doors/models?style=${encodeURIComponent(style||'')}`)
    if (!r.ok) throw new Error(`models HTTP ${r.status}`)
    return r.json()
  },
  async price(selection: Selection): Promise<PriceResp> {
    const r = await fetch(`${API}/price/doors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selection }) })
    if (!r.ok) throw new Error(`price HTTP ${r.status}`)
    return r.json()
  },
  async kp(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetch(`${API}/cart/export/doors/kp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart }) })
    if (!r.ok) throw new Error(`kp HTTP ${r.status}`)
    return r.text()
  },
  async invoice(cart: { items: CartItem[]; customer?: { name?: string; inn?: string } }): Promise<string> {
    const r = await fetch(`${API}/cart/export/doors/invoice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart }) })
    if (!r.ok) throw new Error(`invoice HTTP ${r.status}`)
    return r.text()
  },
  async factory(cart: { items: CartItem[] }): Promise<string> {
    const r = await fetch(`${API}/cart/export/doors/factory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart }) })
    if (!r.ok) throw new Error(`factory HTTP ${r.status}`)
    return r.text()
  },
}

const api = API ? realApi : mockApi

// -----------------------------
// UI
// -----------------------------
export default function App(){
  const [sel,setSel] = useState<Selection>({})
  const [domain,setDomain] = useState<Domain|null>(null)
  const [models,setModels] = useState<ModelCard[]>([])
  const [price,setPrice] = useState<PriceResp|null>(null)
  const [cart,setCart] = useState<CartItem[]>([])
  const [kpHtml,setKpHtml] = useState<string>('')
  const [err,setErr] = useState<string|null>(null)

  // load domains
  const query = useMemo(()=>{ const q = new URLSearchParams(); (['style','model','finish','color','type','width','height'] as const).forEach(k=>{ const v = (sel as any)[k]; if(v!==undefined&&v!=='') q.set(k,String(v)) }); return q },[sel])
  useEffect(()=>{ let c=false; (async()=>{ try{ const r = await api.getOptions(query); if(!c) setDomain(r.domain) }catch(e:any){ if(!c) setErr(e?.message||'Ошибка доменов') } })(); return ()=>{c=true} },[query])

  // load models by style
  useEffect(()=>{ let c=false; (async()=>{ try{ const rows = await (api as any).listModelsByStyle?.(sel.style) ?? await mockApi.listModelsByStyle(sel.style); if(!c) setModels(rows) }catch{} })(); return ()=>{c=true} },[sel.style])

  // auto pricing
  useEffect(()=>{ let c=false; (async()=>{ if(!hasBasic(sel)) { setPrice(null); return } try{ const p = await api.price(sel); if(!c) setPrice(p) }catch(e:any){ if(!c) setErr(e?.message||'Ошибка расчёта') } })(); return ()=>{c=true} },[sel])

  // cart helpers
  const addToCart = ()=>{ if(!price) return; const item: CartItem = { id: uid(), model: sel.model!, width: sel.width!, height: sel.height!, color: sel.color, qty: 1, unitPrice: price.total, handleId: sel.handle?.id }; setCart(c=>[...c,item]) }
  const removeFromCart = (id:string)=> setCart(c=>c.filter(i=>i.id!==id))
  const changeQty = (id:string,qty:number)=> setCart(c=>c.map(i=>i.id===id?{...i, qty: Math.max(1, qty)}:i))
  const total = cart.reduce((s,i)=>s+i.unitPrice*i.qty,0)

  // exporters
  const download = (filename:string, mime:string, content:string)=>{ const blob = new Blob([content],{type:mime}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url) }
  const exportKP = async()=>{ const html = await api.kp({ items: cart }); download('kp.html','text/html;charset=utf-8',html); setKpHtml(html) }
  const exportInvoice = async()=>{ const html = await api.invoice({ items: cart, customer: { name: 'ООО Покупатель', inn: '7700000000' } }); download('invoice.html','text/html;charset=utf-8',html) }
  const exportFactory = async()=>{ const csv = await api.factory({ items: cart }); download('factory.csv','text/csv;charset=utf-8',csv) }

  const change = (k:keyof Selection, v:any)=> setSel(s=>({ ...s, [k]: v }))

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
        {/* Main (2/3): Styles → Models → Params */}
        <main className="lg:col-span-2 space-y-8">
          {/* Styles */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Полотно</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {styleTiles.map(s=> (
                <button key={s.key} onClick={()=>change('style', s.key)} className={`group overflow-hidden rounded-2xl shadow hover:shadow-lg transition ${sel.style===s.key?'ring-2 ring-black':''}`}>
                  <div className="aspect-[4/3] flex items-center justify-center" style={{ background: s.bg }}>
                    {/* simple door sketch */}
                    <div className="w-16 h-28 bg-white rounded-sm shadow-inner border border-black/10 relative">
                      <div className="absolute right-1/4 top-1/2 w-4 h-1 bg-black/30"/>
                    </div>
                  </div>
                  <div className="p-3 text-left">
                    <div className="font-medium">{s.key}</div>
                    <div className="text-xs text-gray-500">Выбрать стиль</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Models */}
          {sel.style && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">Покрытие и цвет — Модели ({models.length})</h2>
                <button className="text-sm underline" onClick={()=>change('style','')}>Сбросить стиль</button>
              </div>
              {models.length ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {models.map(m=> (
                    <button key={m.model} onClick={()=>change('model', m.model)} className={`group rounded-2xl overflow-hidden shadow hover:shadow-lg transition ${sel.model===m.model?'ring-2 ring-black':''}`}>
                      <div className="aspect-[4/3] bg-gray-100" style={{ backgroundImage:`url(${m.photo})`, backgroundSize:'cover', backgroundPosition:'center' }} />
                      <div className="p-3 text-left">
                        <div className="font-medium">{m.model}</div>
                        <div className="text-xs text-gray-500">{m.style}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (<div className="text-gray-500">Нет моделей для выбранного стиля</div>)}
            </section>
          )}

          {/* Params + Accessories */}
          {sel.model && (
            <section className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Select label="Покрытие" value={sel.finish||''} onChange={v=>change('finish',v)} options={domain?.finish||[]} />
                <Select label="Цвет" value={sel.color||''} onChange={v=>change('color',v)} options={domain?.color||[]} />
                <Select label="Тип" value={sel.type||''} onChange={v=>change('type',v)} options={domain?.type||[]} />
                <Select label="Ширина" value={sel.width?.toString()||''} onChange={v=>change('width',Number(v))} options={(domain?.width||[]).map(String)} />
                <Select label="Высота" value={sel.height?.toString()||''} onChange={v=>change('height',Number(v))} options={(domain?.height||[]).map(String)} />
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                <h3 className="font-semibold">Выбор фурнитуры и ручек</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Фурнитура</div>
                    <Select label="Комплект фурнитуры" value={sel.hardware_kit?.id||''} onChange={v=>change('hardware_kit', v?{id:v}:undefined)} options={(domain?.kits||[]).map(k=>k.id)} allowEmpty />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Ручка</div>
                    <Select label="Ручка" value={sel.handle?.id||''} onChange={v=>change('handle', v?{id:v}:undefined)} options={(domain?.handles||[]).map(h=>h.id)} allowEmpty />
                  </div>
                </div>
              </div>

              {/* Preview last generated KP for convenience */}
              {kpHtml && (
                <div className="bg-white rounded-2xl shadow p-4">
                  <h3 className="font-semibold mb-2">Предпросмотр КП</h3>
                  <iframe className="w-full h-80 border rounded" srcDoc={kpHtml} />
                </div>
              )}
            </section>
          )}
        </main>

        {/* Sidebar (1/3): Summary + Cart */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            {/* Selected Params Summary */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="font-semibold mb-2">Параметры</h2>
              <div className="text-sm space-y-1">
                <div><span className="text-gray-500">Стиль:</span> {sel.style||'—'}</div>
                <div><span className="text-gray-500">Полотно:</span> {sel.model||'—'}</div>
                <div><span className="text-gray-500">Покрытие и цвет:</span> {sel.finish||'—'}{sel.color?`, ${sel.color}`:''}</div>
                <div><span className="text-gray-500">Короб:</span> Pro</div>
                <div><span className="text-gray-500">Наличник:</span> Прямой 70 мм</div>
                <div><span className="text-gray-500">Алюминиевая кромка:</span> Отсутствует</div>
              </div>
              <div className="mt-3 text-3xl font-bold">{price? `${fmtInt(price.total)} ₽` : '—'}</div>
              <div className="flex gap-3 mt-3">
                <button disabled={!price} onClick={addToCart} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">В корзину</button>
                <button disabled={!cart.length} onClick={exportKP} className="px-4 py-2 rounded-xl border disabled:opacity-50">КП</button>
              </div>
            </div>

            {/* Cart */}
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Корзина ({cart.length})</h2>
                <div className="text-sm text-gray-600">Итого: <span className="font-semibold">{fmtInt(total)} ₽</span></div>
              </div>
              {cart.length ? (
                <div className="space-y-2">
                  {cart.map(i=> (
                    <div key={i.id} className="border rounded-xl p-2">
                      <div className="text-sm">{i.model} ({i.width}×{i.height}{i.color?`, ${i.color}`:''})</div>
                      <div className="flex items-center justify-between mt-1">
                        <input type="number" min={1} value={i.qty} className="w-16 border rounded px-2 py-1" onChange={e=>changeQty(i.id, Number(e.target.value)||1)} />
                        <div className="text-sm">{fmtInt(i.unitPrice*i.qty)} ₽</div>
                        <button className="text-red-600 text-sm" onClick={()=>removeFromCart(i.id)}>Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (<div className="text-gray-500">Корзина пуста</div>)}

              <div className="flex flex-wrap gap-2 mt-3">
                <button disabled={!cart.length} onClick={exportInvoice} className="px-3 py-2 rounded-xl border disabled:opacity-50">Счет</button>
                <button disabled={!cart.length} onClick={exportFactory} className="px-3 py-2 rounded-xl border disabled:opacity-50">Заказ на фабрику</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options, allowEmpty=false }:{ label:string; value:string; onChange:(v:string)=>void; options:string[]; allowEmpty?:boolean }){
  return (
    <label className="text-sm space-y-1">
      <div className="text-gray-600">{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} className="w-full border rounded-xl px-3 py-2">
        {allowEmpty && <option value="">—</option>}
        {options.map(o=> <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
