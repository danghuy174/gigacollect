"use client";
import { useMemo, useState } from "react";
import Image from "next/image";

type ApiResponse = {
  data: Array<{
    address: string;
    items: Array<{ 
      id: string; 
      name: string; 
      balance: number;
      image?: string;
      description?: string;
      attributes?: Array<{
        trait_type: string;
        value: string;
      }>;
    }>;
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
        .map((s: string) => s.trim())
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
    } catch (e: any) {
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
            onChange={(e: any) => setAddressesText(e.target.value)}
          />

          <div className="mt-3 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={offline} onChange={(e: any) => setOffline(e.target.checked)} />
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
            {results.map(({ address, items }: any) => (
              <div key={address} className="border border-gray-200 rounded-lg p-4 bg-white/70 dark:bg-black/40">
                <div className="font-semibold text-sm break-all mb-4">{address}</div>
                {items.length === 0 ? (
                  <div className="text-sm text-gray-600 mt-2">Không có items</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((it: any) => (
                      <div key={`${address}-${it.id}`} className="flex items-center justify-between p-3 bg-white/50 dark:bg-black/30 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {it.image && (
                            <div className="flex-shrink-0">
                              <Image
                                src={it.image}
                                alt={it.name}
                                width={40}
                                height={40}
                                className="rounded object-cover"
                                onError={(e: any) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{it.name}</div>
                            <div className="text-xs text-gray-500">ID: {it.id}</div>
                            {it.description && (
                              <div className="text-xs text-gray-600 mt-1 truncate">{it.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">x{it.balance.toLocaleString()}</div>
                            {it.attributes && it.attributes.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {it.attributes.find((attr: any) => attr.trait_type === 'Rarity')?.value || 'Common'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
