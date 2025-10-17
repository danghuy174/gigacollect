"use client";
import { useMemo, useState } from "react";
import Image from "next/image";

type ApiResponse = {
  data: Array<{
    address: string;
    items: Array<{ id: string; name: string; balance: number }>;
  }>;
};

export default function Home() {
  const [addressesText, setAddressesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ApiResponse["data"]>([]);
  const [offline, setOffline] = useState(false);

  const addresses = useMemo(
    () =>
      addressesText
        .split(/\n|,|;|\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [addressesText]
  );

  async function handleFetch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses, offline }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ApiResponse;
      setResults(json.data ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-cover bg-center" style={{ backgroundImage: 'url(/main-background.png)' }}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="bg-white/80 dark:bg-black/50 backdrop-blur rounded-xl p-6 shadow">
          <div className="flex items-center gap-3 mb-4">
            <Image src="/next.svg" alt="Logo" width={120} height={26} />
            <h1 className="text-xl font-semibold">Gigaverse Item Lookup</h1>
          </div>

          <label className="block text-sm font-medium mb-2">Nhập địa chỉ (cách nhau bằng dấu phẩy, dòng mới...)</label>
          <textarea
            className="w-full h-32 p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="0x123..., 0xabc..., ..."
            value={addressesText}
            onChange={(e) => setAddressesText(e.target.value)}
          />

          <div className="mt-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
              Dùng dữ liệu mẫu (offline)
            </label>
            <button
              onClick={handleFetch}
              disabled={!addresses.length || loading}
              className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            >
              {loading ? "Đang lấy..." : "Lấy items"}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">{error}</div>
          )}

          <div className="mt-6 space-y-6">
            {results.map(({ address, items }) => (
              <div key={address} className="border border-gray-200 rounded-lg p-4 bg-white/70 dark:bg-black/40">
                <div className="font-semibold text-sm break-all">{address}</div>
                {items.length === 0 ? (
                  <div className="text-sm text-gray-600 mt-2">Không có items</div>
                ) : (
                  <ul className="mt-2 divide-y divide-gray-200">
                    {items.map((it) => (
                      <li key={`${address}-${it.id}`} className="py-2 flex items-center justify-between text-sm">
                        <span className="font-medium">{it.name}</span>
                        <span className="text-gray-700">x{it.balance}</span>
                        <span className="text-gray-500">ID: {it.id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
