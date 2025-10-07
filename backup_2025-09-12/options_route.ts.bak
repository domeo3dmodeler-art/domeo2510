import { prisma } from '@/lib/db'

// Разрешённые поля и их порядок (цепочка dependsOn)
const FIELDS = ['style','model','finish','color','type','width','height'] as const
type Field = typeof FIELDS[number]

// Безопасная сборка WHERE по выбранным полям
function buildWhere(selected: Partial<Record<Field, string | number>>) {
  const cond: string[] = []
  const params: any[] = []
  FIELDS.forEach((f) => {
    const v = (selected as any)[f]
    if (v !== undefined && v !== null && v !== '') {
      cond.push(`${f} = $${params.length + 1}`)
      params.push(v)
    }
  })
  return { sql: cond.length ? `WHERE ${cond.join(' AND ')}` : '', params }
}

// DISTINCT по колонке с учетом фильтров
async function distinctOf(col: Field, whereSql: string, params: any[]) {
  const order = col === 'width' || col === 'height' ? `ORDER BY ${col}::int` : `ORDER BY ${col}`
  const rows = await prisma.$queryRawUnsafe<{ v: any }[]>(
    `SELECT DISTINCT ${col} as v FROM products ${whereSql} ${order}`, ...params
  )
  return rows.map(r => r.v).filter((x:any)=> x!==null && x!=='')
}

export async function GET(req: Request) {
  // читаем выбранные фильтры из query
  const url = new URL(req.url)
  const selected: Partial<Record<Field, any>> = {}
  for (const f of FIELDS) {
    const raw = url.searchParams.get(f)
    if (raw !== null) selected[f] = (f==='width'||f==='height') ? Number(raw) : raw
  }

  // базовый WHERE
  const { sql: whereSql, params } = buildWhere(selected)

  // считаем домены опций
  const result: Record<string, any[]> = {}
  for (const f of FIELDS) {
    // важно: считаем DISTINCT по каждому полю при текущем WHERE (всё выбранное учитывается)
    result[f] = await distinctOf(f, whereSql, params)
  }

  // дополнительные справочники
  const kits = await prisma.$queryRawUnsafe<{id:string,name:string,price_rrc:number}[]>(
    `SELECT id, COALESCE(name,'') as name, COALESCE(price_rrc,0) as price_rrc FROM kits ORDER BY name NULLS LAST`
  )
  const handles = await prisma.$queryRawUnsafe<{id:string,name_web:string,price_opt:number,price_group_multiplier:number}[]>(
    `SELECT id, COALESCE(name_web,'') as name_web, COALESCE(price_opt,0) as price_opt, COALESCE(price_group_multiplier,1) as price_group_multiplier FROM handles ORDER BY name_web NULLS LAST`
  )

  return Response.json({ ...result, kits, handles })
}
