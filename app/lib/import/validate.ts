// app/lib/import/validate.ts
import { FieldSpec } from './types';

export function validateCommon(rows: any[], schema: FieldSpec[], defaults: Record<string, any>) {
  const errors: { index:number; sku?:string; reason:string }[] = [];
  const ok: any[] = [];
  const required = new Set(schema.filter(s=>s.required).map(s=>s.dest));

  rows.forEach((r, i) => {
    for (const dest of required) {
      const v = (r as any)[dest];
      if (v == null || v === '') { errors.push({ index:i, sku:r.sku, reason:`Отсутствует обязательное поле: ${dest}` }); return; }
    }

    // type checks (soft)
    for (const f of schema) {
      const v = (r as any)[f.dest];
      if (v == null || v === '') continue;
      if (f.type === 'int' || f.type === 'number') {
        const n = Number(v);
        if (!isFinite(n)) { errors.push({ index:i, sku:r.sku, reason:`Поле ${f.dest} не число` }); return; }
      }
      if (f.type === 'enum' && f.enumValues && !f.enumValues.includes(String(v))) {
        errors.push({ index:i, sku:r.sku, reason:`Недопустимое значение ${f.dest}: ${v}` }); return;
      }
      if (f.type === 'date') {
        const d = new Date(v);
        if (isNaN(d.getTime())) { errors.push({ index:i, sku:r.sku, reason:`Некорректная дата в ${f.dest}` }); return; }
        const today = new Date(); today.setHours(0,0,0,0);
        if (d > today) { errors.push({ index:i, sku:r.sku, reason:`Дата ${f.dest} в будущем` }); return; }
      }
    }

    ok.push(r);
  });

  return { ok, errors };
}