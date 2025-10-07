import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const style = searchParams.get("style");

  const rows = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT
      model,
      COALESCE(style, '')       AS style,
      COALESCE(model_photo, '') AS photo
    FROM doors_catalog
    WHERE (${style} IS NULL OR style = ${style})
    ORDER BY model
  `;

  const models = rows.map(r => ({
    model: r.model,
    style: r.style || null,
    photo: r.photo || null,
  }));

  return NextResponse.json(models);
}
