import { prisma } from '@/lib/db'

type Selection = {
  model: string; finish: string; color: string; type: string;
  width: number; height: number;
  hardware_kit?: { id?: string };
  handle?: { id?: string };
}

export async function POST(req: Request) {
  const body = await req.json() as { selection?: Selection }
  const sel = body?.selection
  const required = ['model','finish','color','type','width','height'] as const
  if (!sel || !required.every(k => (sel as any)[k] !== undefined && (sel as any)[k] !== null)) {
    return new Response(JSON.stringify({ error: 'selection incomplete' }), { status: 400 })
  }

  let base = 0
  const breakdown: { label: string; amount: number }[] = []

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT rrc_price FROM products
      WHERE model=${sel.model} AND finish=${sel.finish} AND color=${sel.color}
        AND type=${sel.type} AND width=${Number(sel.width)} AND height=${Number(sel.height)}
      LIMIT 1`
    base = Number(rows?.[0]?.rrc_price || 0)
  } catch (e:any) {
    console.error('[price] base fallback:', e?.message || e)
    base = 21280
  }
  breakdown.push({ label: 'Полотно (РРЦ)', amount: base })

  if (sel?.hardware_kit?.id) {
    try {
      const kit = await prisma.$queryRaw<any[]>`SELECT price_rrc FROM kits WHERE id=${sel.hardware_kit.id} LIMIT 1`
      const add = Number(kit?.[0]?.price_rrc || 0)
      if (add) breakdown.push({ label: 'Комплект фурнитуры', amount: add })
    } catch {}
  }

  if (sel?.handle?.id) {
    try {
      const h = await prisma.$queryRaw<any[]>`
        SELECT price_opt, price_group_multiplier FROM handles WHERE id=${sel.handle.id} LIMIT 1`
      const add = Number(h?.[0]?.price_opt || 0) * Number(h?.[0]?.price_group_multiplier || 1)
      if (add) breakdown.push({ label: 'Ручка', amount: add })
    } catch {}
  }

  const total = breakdown.reduce((s, x) => s + x.amount, 0)
  return Response.json({ ok: true, currency: 'RUB', base, breakdown, total })
}
