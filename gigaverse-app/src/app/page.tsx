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

type EnergyInfo = {
  energyValue: number;
  maxEnergy: number;
};

export default function Home() {
  const [addressesText, setAddressesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ApiResponse["data"]>([]);
  const [offline, setOffline] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
  const [energies, setEnergies] = useState<Record<string, EnergyInfo | { error: string }>>({});
  const [activeTab, setActiveTab] = useState<'items' | 'energy'>("items");

  const addresses = useMemo(
    () =>
      addressesText
        .split(/\n|,|;|\s+/)
        .map((s: string) => s.trim())
        .filter(Boolean),
    [addressesText]
  );

  // Filter results based on search text
  const filteredResults = useMemo(() => {
    if (!searchText.trim()) return results;
    
    return results.map(result => ({
      ...result,
      items: result.items.filter((item) => 
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.id.includes(searchText) ||
        (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
      )
    }));
  }, [results, searchText]);

  async function handleFetch() {
    setLoading(true);
    setError(null);
    setEnergies({});

    // We'll track progress for each address energy + 1 step for items aggregation
    const totalSteps = (addresses.length > 0 ? addresses.length : 1) + 1;
    setProgress({ current: 0, total: totalSteps, message: "Đang xử lý..." });

    // Kick off energy fetches per address (skip in offline mode)
    const energyPromises = offline
      ? []
      : addresses.map(async (addr) => {
          try {
            const res = await fetch(`/api/energy/${addr}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`Energy HTTP ${res.status}`);
            const json = (await res.json()) as {
              entities?: Array<{ parsedData?: { energyValue?: number; maxEnergy?: number } }>
            };
            const entity = json.entities?.[0];
            const energyValue = Number(entity?.parsedData?.energyValue ?? 0);
            const maxEnergy = Number(entity?.parsedData?.maxEnergy ?? 0);
            setEnergies((prev) => ({ ...prev, [addr]: { energyValue, maxEnergy } }));
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Energy load failed";
            setEnergies((prev) => ({ ...prev, [addr]: { error: msg } }));
          } finally {
            setProgress((p) => ({ ...p, current: Math.min(p.current + 1, totalSteps) }));
          }
        });

    // Kick off items fetch in parallel
    const itemsPromise = (async () => {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses, offline }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as ApiResponse;
      setResults(json.data ?? []);
      setProgress((p) => ({ ...p, current: energyPromises.length === 0 ? totalSteps : Math.min(p.current + 1, totalSteps), message: "Hoàn thành!" }));
    })();

    try {
      await Promise.allSettled([itemsPromise, Promise.allSettled(energyPromises)]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress({ current: 0, total: 0, message: "" }), 2000);
    }
  }

  return (
    <div className="min-h-screen w-full bg-cover bg-center" style={{ backgroundImage: 'url(/main-background.png)' }}>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="glass-card rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Image src="/globe.svg" alt="Gigaverse" width={36} height={36} />
              <h1 className="text-2xl font-semibold neon-text">Gigaverse Item Lookup</h1>
            </div>
            <div className="text-xs text-gray-400">v2</div>
          </div>

          <label className="block text-sm font-medium mb-2">Nhập địa chỉ (cách nhau bằng dấu phẩy, dòng mới...)</label>
          <textarea
            className="w-full h-32 p-3 rounded border border-gray-700/40 bg-black/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
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
              className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-500 transition text-white disabled:opacity-50"
            >
              {loading ? "Đang lấy..." : "Lấy Item"}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600">{error}</div>
          )}

          {progress.total > 0 && (
            <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/10">
              <div className="flex items-center justify-between text-sm mb-2 text-gray-300">
                <span>{loading ? progress.message : ""}</span>
                <span className="neon-number">{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${loading ? "bg-emerald-500" : "bg-violet-500"}`}
                  style={{ width: `${progress.total === 0 ? 0 : (progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {(addresses.length > 0) && (
            <div className="mt-4">
              <div className="inline-flex rounded-lg overflow-hidden border border-white/10 bg-black/30">
                <button
                  className={`px-4 py-2 text-sm transition ${activeTab === 'items' ? 'bg-violet-600 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                  onClick={() => setActiveTab('items')}
                >
                  Items
                </button>
                <button
                  className={`px-4 py-2 text-sm transition border-l border-white/10 ${activeTab === 'energy' ? 'bg-violet-600 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                  onClick={() => setActiveTab('energy')}
                >
                  Năng lượng
                </button>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <>
              {results.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Tìm kiếm items:</label>
                    {searchText && (
                      <button
                        onClick={() => setSearchText("")}
                        className="text-xs text-gray-400 hover:text-gray-200"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="w-full p-3 rounded border border-gray-700/40 bg-black/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                    placeholder="Tìm theo tên, ID, hoặc mô tả..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  {searchText && (
                    <div className="mt-2 text-xs text-gray-400">
                      Tìm thấy {filteredResults.reduce((total, result) => total + result.items.length, 0)} items
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 space-y-6">
                {filteredResults.map(({ address, items }) => (
                  <div key={address} className="rounded-lg p-4 bg-black/30 border border-white/10">
                    <div className="font-semibold text-sm break-all mb-4 text-gray-300">{address}</div>
                    {items.length === 0 ? (
                      <div className="text-sm text-gray-400 mt-2">Không có items</div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {items.map((it) => (
                          <div key={`${address}-${it.id}`} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {it.image && (
                                <div className="flex-shrink-0">
                                  <Image
                                    src={it.image}
                                    alt={it.name}
                                    width={40}
                                    height={40}
                                    className="rounded object-cover"
                                    onError={(e) => {
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
                                <div className="text-lg font-bold neon-number">x{it.balance.toLocaleString()}</div>
                                {it.attributes && it.attributes.length > 0 && (
                                  <div className="text-xs text-gray-400">
                                    {it.attributes.find((attr) => attr.trait_type === 'Rarity')?.value || 'Common'}
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
            </>
          )}

          {activeTab === 'energy' && (
            <>
              {offline && addresses.length > 0 && (
                <div className="mt-6 text-sm text-gray-400">
                  Năng lượng không khả dụng ở chế độ offline.
                </div>
              )}

              {!offline && addresses.length > 0 && (
                <div className="mt-6">
                  <div className="text-sm font-medium text-gray-200 mb-2">Năng lượng</div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {addresses.map((addr) => {
                      const energy = energies[addr] as EnergyInfo | { error: string } | undefined;
                      const value = (energy && "energyValue" in energy) ? energy.energyValue : 0;
                      const max = (energy && "maxEnergy" in energy) ? energy.maxEnergy : 0;
                      const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
                      return (
                        <div key={`energy-${addr}`} className="rounded-lg p-3 bg-black/30 border border-white/10">
                          <div className="flex items-center justify-between mb-2 text-xs text-gray-300">
                            <span className="truncate mr-2">{addr}</span>
                            {energy && "error" in energy ? (
                              <span className="text-red-400">Lỗi tải năng lượng</span>
                            ) : (
                              <span className="neon-number">{value}/{max}</span>
                            )}
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-500 bg-cyan-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
