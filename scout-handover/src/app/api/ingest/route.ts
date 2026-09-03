import { NextResponse } from "next/server";
import { runIngestion } from "@/ingest/run";

export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.INGEST_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const report = await runIngestion();
  return NextResponse.json(report);
}

export const GET = POST; // vercel cron issues GET
