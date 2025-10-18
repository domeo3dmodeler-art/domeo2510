export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '20');
  const q = (searchParams.get('q') ?? '').trim();

  const where = q
    ? { OR: [{ sku: { contains: q, mode: 'insensitive' as const } }, { series: { contains: q, mode: 'insensitive' as const } }] }
    : {};

  const [items, total] = await Promise.all([
    prisma.doors_catalog.findMany({ where, skip: (page-1)*pageSize, take: pageSize, orderBy: { id: 'desc' } }),
    prisma.doors_catalog.count({ where }),
  ]);

  return NextResponse.json({ page, pageSize, total, items });
}
