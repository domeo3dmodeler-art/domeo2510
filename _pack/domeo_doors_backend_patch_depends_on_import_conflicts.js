// Domeo • Doors — Backend Patch (dependsOn + import conflicts)
// Вклей в backend/server.js. Патч включает: dependsOn для /catalog/doors/options
// и CSV‑отчёт конфликтов РРЦ в /admin/import/doors с безопасным UPSERT.

/* ===================== SCHEMA UPGRADE =====================
Добавь это рядом с существующим bootstrap-схемой (после CREATE TABLE products):

await q(`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'products_uq'
    ) THEN
      CREATE UNIQUE INDEX products_uq ON products (model, finish, color, type, width, height);
    END IF;
  END $$;
`)
*/

/* ===================== PATCH 1: /catalog/doors/options (dependsOn) ===================== */
app.get('/catalog/doors/options', async (req,res)=>{
  const chain = ['style','model','finish','color','type','width','height']
  const pick = (arr, key)=> Array.from(new Set(arr.map(x=>x[key]).filter(v=>v!==null && v!==''))).sort((a,b)=> a>b?1:a<b?-1:0)

  // Базовая выборка для уже выбранных фильтров
  const filters = []
  const params = []
  for(const k of chain){ if(req.query[k]){ filters.push(`${k}=$${filters.length+1}`); params.push(req.query[k]) } }
  const where = filters.length?`WHERE ${filters.join(' AND ')}`:''

  // Все строки (для доменов style) и отфильтрованные (для остальных доменов)
  const all = await q('SELECT * FROM products', [])
  const rows = await q(`SELECT * FROM products ${where}`, params)

  // dependsOn: домен каждого поля строится по значению всех предыдущих полей в цепочке
  const domain = {}
  for(const key of chain){
    const upstream = chain.slice(0, chain.indexOf(key))
    const uFilters = []
    const uParams = []
    for(const k of upstream){ if(req.query[k]){ uFilters.push(`${k}=$${uFilters.length+1}`); uParams.push(req.query[k]) } }
    const uWhere = uFilters.length?`WHERE ${uFilters.join(' AND ')}`:''
    const scope = await q(`SELECT ${key} FROM products ${uWhere}`, uParams)
    domain[key] = pick(scope, key)
  }

  // Дополнительно: если выбраны style/model — сузим домены по rows
  if(req.query.style || req.query.model){
    for(const k of ['model','finish','color','type','width','height']){
      domain[k] = pick(rows, k)
    }
  }

  // kits/handles из БД
  domain.kits = await q('SELECT id,name,grp as "group",price_rrc FROM kits', [])
  domain.handles = await q('SELECT id,name,supplier_name,supplier_sku,price_opt,price_rrc,price_group_multiplier FROM handles', [])

  res.json({ ok:true, domain })
})

/* ===================== PATCH 2: /admin/import/doors (conflict CSV + safe UPSERT) ===================== */
app.post('/admin/import/doors', auth, upload.single('file'), async (req,res)=>{
  if(!req.file) return res.status(400).json({ error:'file required' })
  const p = path.join(MEDIA_DIR, req.file.filename)

  // parse rows
  let rows = []
  if(req.file.originalname.endsWith('.xlsx')){
    const wb = XLSX.readFile(p)
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(ws)
  } else {
    const txt = fs.readFileSync(p, 'utf8')
    await new Promise((resolve,reject)=>{ parse(txt, { columns: true, skip_empty_lines: true }, (err,out)=>{ if(err) reject(err); rows=out; resolve() }) })
  }

  const v = (r,k)=> r[k] ?? r[k?.toUpperCase?.()] ?? r[k?.toLowerCase?.()]
  const keyOf = (r)=> [v(r,'model'),v(r,'finish'),v(r,'color'),v(r,'type'),String(v(r,'width')),String(v(r,'height'))].join('|')

  // normalize + validate
  const norm = rows.map(r=>({
    model: v(r,'model'), style: v(r,'style'), finish: v(r,'finish'), color: v(r,'color'), type: v(r,'type'),
    width: Number(v(r,'width')), height: Number(v(r,'height')),
    rrc_price: Number(v(r,'rrc_price')||0), sku_1c: v(r,'sku_1c')||null,
    supplier: v(r,'supplier')||null, collection: v(r,'collection')||null,
    supplier_item_name: v(r,'supplier_item_name')||null,
    supplier_color_finish: v(r,'supplier_color_finish')||null,
    price_opt: v(r,'price_opt')?Number(v(r,'price_opt')):null,
    model_photo: v(r,'model_photo')||null,
    __key: null
  })).filter(r=> r.model && r.finish && r.color && r.type && Number.isFinite(r.width) && Number.isFinite(r.height))
  norm.forEach(r=> r.__key = [r.model,r.finish,r.color,r.type,String(r.width),String(r.height)].join('|'))

  // group by key
  const groups = new Map()
  for(const r of norm){ if(!groups.has(r.__key)) groups.set(r.__key, []); groups.get(r.__key).push(r) }

  // detect conflicts by RRC price
  const conflicts = []
  let conflictGroup = 0
  for(const [k, arr] of groups){
    const uniqueRRC = Array.from(new Set(arr.map(x=>x.rrc_price)))
    if(uniqueRRC.length > 1){
      conflictGroup += 1
      for(const x of arr){ conflicts.push({
        model:x.model, finish:x.finish, color:x.color, type:x.type, width:x.width, height:x.height,
        rrc_price_source: 'file', rrc_price: x.rrc_price, conflict_group: conflictGroup,
        action: 'review' }) }
    }
  }

  if(conflicts.length){
    const header = 'model,finish,color,type,width,height,rrc_price_source,rrc_price,conflict_group,action' 
    const lines = [header, ...conflicts.map(c => [c.model,c.finish,c.color,c.type,c.width,c.height,c.rrc_price_source,c.rrc_price,c.conflict_group,c.action].join(','))]
    res.status(409)
    res.setHeader('Content-Type','text/csv; charset=utf-8')
    return res.send(lines.join('\n'))
  }

  // choose canonical (min RRC) per key; upsert
  let up=0
  for(const [k, arr] of groups){
    const canon = arr.reduce((a,b)=> (a.rrc_price<=b.rrc_price? a : b))
    const existing = await q(`SELECT id FROM products WHERE model=$1 AND finish=$2 AND color=$3 AND type=$4 AND width=$5 AND height=$6 LIMIT 1`, [canon.model,canon.finish,canon.color,canon.type,canon.width,canon.height])
    if(existing.length){
      await q(`UPDATE products SET style=$1, rrc_price=$2, sku_1c=$3, supplier=$4, collection=$5, supplier_item_name=$6, supplier_color_finish=$7, price_opt=$8, model_photo=$9 WHERE id=$10`, [
        canon.style, canon.rrc_price, canon.sku_1c, canon.supplier, canon.collection, canon.supplier_item_name, canon.supplier_color_finish, canon.price_opt, canon.model_photo, existing[0].id
      ])
    } else {
      await q(`INSERT INTO products(model,style,finish,color,type,width,height,rrc_price,sku_1c,supplier,collection,supplier_item_name,supplier_color_finish,price_opt,model_photo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [
        canon.model, canon.style, canon.finish, canon.color, canon.type, canon.width, canon.height, canon.rrc_price, canon.sku_1c, canon.supplier, canon.collection, canon.supplier_item_name, canon.supplier_color_finish, canon.price_opt, canon.model_photo
      ])
    }
    up++
  }

  return res.json({ ok:true, imported: up })
})

/* ===================== Smoke tests (curl) =====================
# 1) dependsOn — домен ширины при style=Современная и model=PG Base 1
curl -s 'http://localhost:3001/catalog/doors/options?style=%D0%A1%D0%BE%D0%B2%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F&model=PG%20Base%201' | jq '.domain.width'

# 2) Импорт: если конфликты РРЦ — 409 + CSV
curl -f -X POST -H 'Authorization: Bearer $TOKEN' -F 'file=@doors_conflict.csv' http://localhost:3001/admin/import/doors || true

# 3) Импорт без конфликтов — 200 { ok:true, imported:N }
curl -X POST -H 'Authorization: Bearer $TOKEN' -F 'file=@doors_ok.csv' http://localhost:3001/admin/import/doors
*/
