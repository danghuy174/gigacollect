import { NextRequest, NextResponse } from "next/server";
import { fetchMultipleEthBalances } from "@/lib/gigaverse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { addresses?: string[] };
    const addresses = body.addresses ?? [];

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: "addresses required" }, { status: 400 });
    }

    const result = await fetchMultipleEthBalances(addresses);

    return NextResponse.json({
      data: result
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch ETH balances" }, { status: 500 });
  }
}
