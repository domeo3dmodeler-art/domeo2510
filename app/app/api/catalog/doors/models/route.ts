import { NextRequest, NextResponse } from "next/server";
import { mockDoorsData } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const style = searchParams.get("style");

  // Use mock data instead of database
  let models = mockDoorsData.models;
  
  if (style) {
    models = models.filter(m => m.style === style);
  }

  return NextResponse.json(models);
}
