import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  const rows = await prisma.$queryRaw<any[]>`
    WITH filtered AS (
      SELECT * FROM doors_catalog
      WHERE (${style}  IS NULL OR style  = ${style})
        AND (${model}  IS NULL OR model  = ${model})
        AND (${finish} IS NULL OR finish = ${finish})
        AND (${color}  IS NULL OR color  = ${color})
        AND (${type}   IS NULL OR type   = ${type})
        AND (${width}  IS NULL OR CAST(width  AS TEXT) = ${width})
        AND (${height} IS NULL OR CAST(height AS TEXT) = ${height})
    )
    SELECT
      ARRAY(SELECT DISTINCT style  FROM filtered ORDER BY style)  AS styles,
      ARRAY(SELECT DISTINCT model  FROM filtered ORDER BY model)  AS models,
      ARRAY(SELECT DISTINCT finish FROM filtered ORDER BY finish) AS finishes,
      ARRAY(SELECT DISTINCT color  FROM filtered ORDER BY color)  AS colors,
      ARRAY(SELECT DISTINCT type   FROM filtered ORDER BY type)   AS types,
      ARRAY(SELECT DISTINCT width  FROM filtered ORDER BY width)  AS widths,
      ARRAY(SELECT DISTINCT height FROM filtered ORDER BY height) AS heights
  `;
  const row = rows?.[0] || {};

  const kits = await prisma.$queryRaw<any[]>`
    SELECT id, name, COALESCE(price_rrc,0) AS price_rrc, COALESCE(model,'') AS model
    FROM doors_kits
    WHERE (${model} IS NULL OR model = ${model})
    ORDER BY sort_order NULLS LAST, name
  `;

  const handles = await prisma.$queryRaw<any[]>`
    SELECT id, name,
           COALESCE(price_opt,0) AS price_opt,
           COALESCE(price_group_multiplier,1.0) AS price_group_multiplier,
           COALESCE(supplier_name,'') AS supplier_name,
           COALESCE(supplier_sku,'')  AS supplier_sku
    FROM doors_handles
    ORDER BY sort_order NULLS LAST, name
  `;

  return NextResponse.json({
    ok: true,
    domain: {
      style:   row.styles   || [],
      model:   row.models   || [],
      finish:  row.finishes || [],
      color:   row.colors   || [],
      type:    row.types    || [],
      width:   row.widths   || [],
      height:  row.heights  || [],
      kits,
      handles,
    }
  });
}
