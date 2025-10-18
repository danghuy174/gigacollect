import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  const address = params.address;
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://gigaverse.io/api/offchain/player/energy/${address}`,
      { cache: "no-store" }
    );
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: text || "Upstream error" }, { status: res.status });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch energy" }, { status: 500 });
  }
}
