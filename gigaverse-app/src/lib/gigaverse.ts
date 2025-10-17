import path from "node:path";
import { readFile } from "node:fs/promises";

export type RawEntity = {
  docId?: string;
  ID_CID?: string;
  NAME_CID?: string;
  PLAYER_CID?: string;
  BALANCE_CID?: number;
  [key: string]: unknown;
};

export type GameItemsResponse = {
  entities?: RawEntity[];
};

export type PlayerItemsResponse = {
  entities?: RawEntity[];
};

export type MappedItem = {
  id: string;
  name: string;
  balance: number;
};

export type AddressItems = {
  address: string;
  items: MappedItem[];
};

async function readJsonFromFile<T = unknown>(relativeFilePath: string): Promise<T> {
  const filePath = path.join(process.cwd(), relativeFilePath);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export async function fetchGameItems(offline = false): Promise<Map<string, RawEntity>> {
  const buildMap = (resp: GameItemsResponse): Map<string, RawEntity> => {
    const map = new Map<string, RawEntity>();
    for (const entity of resp.entities ?? []) {
      const id = String(entity.docId ?? entity.ID_CID ?? "");
      if (!id) continue;
      map.set(id, entity);
    }
    return map;
  };

  if (offline) {
    const resp = await readJsonFromFile<GameItemsResponse>("data/log_example/game_item.json");
    return buildMap(resp);
  }

  try {
    const res = await fetch("https://gigaverse.io/api/indexer/gameItems", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as GameItemsResponse;
    return buildMap(data);
  } catch {
    const resp = await readJsonFromFile<GameItemsResponse>("data/log_example/game_item.json");
    return buildMap(resp);
  }
}

export async function fetchPlayerItems(address: string, offline = false): Promise<PlayerItemsResponse> {
  if (offline) {
    // Local sample contains a single address snapshot; return that when it matches, else empty
    const resp = await readJsonFromFile<PlayerItemsResponse>("data/log_example/balance.json");
    const sampleAddr = (resp.entities?.[0]?.PLAYER_CID as string | undefined)?.toLowerCase();
    if (sampleAddr && sampleAddr === address.toLowerCase()) return resp;
    return { entities: [] };
  }

  try {
    const res = await fetch(
      `https://gigaverse.io/api/indexer/player/gameitems/${address}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PlayerItemsResponse;
  } catch {
    const resp = await readJsonFromFile<PlayerItemsResponse>("data/log_example/balance.json");
    return resp;
  }
}

export async function mapAddressesToItems(addresses: string[], offline = false): Promise<AddressItems[]> {
  const gameItemsMap = await fetchGameItems(offline);

  const results = await Promise.all(
    addresses.map(async (addrRaw) => {
      const address = addrRaw.trim();
      if (!address) return { address, items: [] } satisfies AddressItems;

      const playerResp = await fetchPlayerItems(address, offline);
      const items: MappedItem[] = [];

      for (const entity of playerResp.entities ?? []) {
        const id = String((entity as RawEntity).ID_CID ?? "");
        const balance = Number((entity as RawEntity).BALANCE_CID ?? 0);
        if (!id) continue;
        if (!Number.isFinite(balance) || balance <= 0) continue;

        const meta = gameItemsMap.get(id);
        const name = String(meta?.NAME_CID ?? `Unknown #${id}`);
        items.push({ id, name, balance });
      }

      // Sort by name then id for stable output
      items.sort((a, b) => (a.name.localeCompare(b.name) || a.id.localeCompare(b.id)));
      return { address, items } satisfies AddressItems;
    })
  );

  return results;
}
