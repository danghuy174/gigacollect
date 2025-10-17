import { NextRequest, NextResponse } from "next/server";
import { mapAddressesToItems } from "@/lib/gigaverse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const addresses = Array.isArray(body?.addresses) ? (body.addresses as string[]) : [];
    const offline = Boolean(body?.offline);

    if (!addresses.length) {
      return NextResponse.json({ error: "addresses is required" }, { status: 400 });
    }

    const data = await mapAddressesToItems(addresses, offline);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
