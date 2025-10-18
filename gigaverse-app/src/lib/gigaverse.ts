import * as path from "path";
import { readFile } from "fs/promises";

export type RawEntity = {
  _id?: string;
  docId?: string;
  ID_CID?: string;
  NAME_CID?: string;
  PLAYER_CID?: string;
  BALANCE_CID?: number;
  BASE_URI_CID?: string;
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
  image?: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
};

export type AddressItems = {
  address: string;
  items: MappedItem[];
};

export type EnergyResponse = {
  entities?: Array<{
    parsedData?: {
      energy?: number;
      energyValue?: number;
      maxEnergy?: number;
      regenPerSecond?: number;
      regenPerHour?: number;
      secondsSinceLastUpdate?: number;
      isPlayerJuiced?: boolean;
    };
  }>;
};

export async function fetchPlayerEnergy(address: string): Promise<{ energyValue: number; maxEnergy: number } | null> {
  try {
    const res = await fetch(`https://gigaverse.io/api/offchain/player/energy/${address}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as EnergyResponse;
    const entity = json.entities?.[0];
    const energyValue = Number(entity?.parsedData?.energyValue ?? 0);
    const maxEnergy = Number(entity?.parsedData?.maxEnergy ?? 0);
    if (!Number.isFinite(energyValue) || !Number.isFinite(maxEnergy)) return null;
    return { energyValue, maxEnergy };
  } catch {
    return null;
  }
}

async function readJsonFromFile<T = unknown>(relativeFilePath: string): Promise<T> {
  const filePath = path.join(process.cwd(), relativeFilePath);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export type ItemMetadata = {
  name: string;
  description: string;
  image: string;
  icon: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
};

export async function fetchItemMetadata(itemId: string, baseUri: string, offline = false): Promise<ItemMetadata | null> {
  if (offline) {
    // For offline mode, return sample metadata
    return {
      name: `Item #${itemId}`,
      description: "Sample item description",
      image: "https://via.placeholder.com/200x200?text=Item",
      icon: "https://via.placeholder.com/64x64?text=Icon",
      attributes: [
        { trait_type: "Rarity", value: "Common" },
        { trait_type: "Type", value: "Game Item" }
      ]
    };
  }

  try {
    const url = `${baseUri}${itemId}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ItemMetadata;
  } catch {
    return null;
  }
}

export async function fetchGameItems(offline = false): Promise<Map<string, RawEntity>> {
  const buildMap = (resp: GameItemsResponse): Map<string, RawEntity> => {
    const map = new Map<string, RawEntity>();
    for (const entity of resp.entities ?? []) {
      const id = String(entity.docId ?? "");
      if (!id) continue;
      map.set(id, entity);
    }
    return map;
  };

  if (offline) {
    // Use sample data only when offline mode is explicitly requested
    const resp = await readJsonFromFile<GameItemsResponse>("data/log_example/game_item.json");
    return buildMap(resp);
  }

  try {
    const res = await fetch("https://gigaverse.io/api/indexer/gameitems", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as GameItemsResponse;
    return buildMap(data);
  } catch (error) {
    // If API fails, fallback to sample data for development
    console.error('Failed to fetch game items from API, using sample data:', error);
    try {
      const resp = await readJsonFromFile<GameItemsResponse>("data/log_example/game_item.json");
      return buildMap(resp);
    } catch (fallbackError) {
      console.error('Failed to load sample data:', fallbackError);
      return new Map<string, RawEntity>();
    }
  }
}

export async function fetchPlayerItems(address: string, offline = false): Promise<PlayerItemsResponse> {
  if (offline) {
    // Use sample data only when offline mode is explicitly requested
    const filePath = path.join(process.cwd(), "data/log_example/balance.json");
    const content = await readFile(filePath, "utf8");
    const lines = content.split('\n');
    const jsonStartIndex = lines.findIndex((line: string) => line.trim().startsWith('{'));
    const jsonContent = lines.slice(jsonStartIndex).join('\n');
    const resp = JSON.parse(jsonContent) as PlayerItemsResponse;
    const sampleAddr = (resp.entities?.[0]?.PLAYER_CID as string | undefined)?.toLowerCase();
    if (sampleAddr && sampleAddr === address.toLowerCase()) return resp;
    return { entities: [] };
  }

  try {
    const res = await fetch(
      `https://gigaverse.io/api/importexport/balances/${address}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PlayerItemsResponse;
  } catch (error) {
    // If API fails, fallback to sample data for development
    console.error('Failed to fetch player items from API, using sample data:', error);
    try {
      const filePath = path.join(process.cwd(), "data/log_example/balance.json");
      const content = await readFile(filePath, "utf8");
      const lines = content.split('\n');
      const jsonStartIndex = lines.findIndex((line: string) => line.trim().startsWith('{'));
      const jsonContent = lines.slice(jsonStartIndex).join('\n');
      const resp = JSON.parse(jsonContent) as PlayerItemsResponse;
      const sampleAddr = (resp.entities?.[0]?.PLAYER_CID as string | undefined)?.toLowerCase();
      if (sampleAddr && sampleAddr === address.toLowerCase()) return resp;
      return { entities: [] };
    } catch (fallbackError) {
      console.error('Failed to load sample data:', fallbackError);
      return { entities: [] };
    }
  }
}

export async function mapAddressesToItems(addresses: string[], offline = false): Promise<AddressItems[]> {
  // Fetch game items once (shared across all addresses)
  const gameItemsMap = await fetchGameItems(offline);
  
  // Aggregate balances across all addresses
  const itemBalances = new Map<string, { totalBalance: number; itemId: string }>();
  
  // Process addresses in batches for better performance
  const BATCH_SIZE = 10; // Process 10 addresses at a time
  const validAddresses = addresses.map(addr => addr.trim()).filter(Boolean);
  
  for (let i = 0; i < validAddresses.length; i += BATCH_SIZE) {
    const batch = validAddresses.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (address) => {
      try {
        const playerResp = await fetchPlayerItems(address, offline);
        return { address, entities: playerResp.entities ?? [] };
      } catch (error) {
        console.error(`Failed to fetch items for ${address}:`, error);
        return { address, entities: [] };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // Aggregate results from batch
    for (const { entities } of batchResults) {
      for (const entity of entities) {
        const id = String((entity as RawEntity).ID_CID ?? "");
        const balance = Number((entity as RawEntity).BALANCE_CID ?? 0);
        if (!id) continue;
        if (!Number.isFinite(balance) || balance <= 0) continue;

        const current = itemBalances.get(id) || { totalBalance: 0, itemId: id };
        current.totalBalance += balance;
        itemBalances.set(id, current);
      }
    }
  }

  // Get base URI from game items (look for the contract item with docId "0")
  let baseUri = "https://gigaverse.io/api/metadata/gameItem/";
  for (const [, entity] of gameItemsMap) {
    if (entity.docId === "0" && entity.BASE_URI_CID) {
      baseUri = String(entity.BASE_URI_CID);
      break;
    }
  }
  
  // Create aggregated items with metadata
  const aggregatedItems: MappedItem[] = [];
  const metadataCache = new Map<string, ItemMetadata | null>();
  
  // First pass: create items without metadata for faster initial display
  for (const [itemId, { totalBalance }] of itemBalances) {
    const meta = gameItemsMap.get(itemId);
    const name = String(meta?.NAME_CID ?? `Unknown #${itemId}`);
    
    aggregatedItems.push({
      id: itemId,
      name: name,
      balance: totalBalance,
      image: undefined, // Will be loaded later
      description: undefined,
      attributes: undefined
    });
  }
  
  // Second pass: fetch metadata in batches for better performance
  const METADATA_BATCH_SIZE = 5;
  for (let i = 0; i < aggregatedItems.length; i += METADATA_BATCH_SIZE) {
    const batch = aggregatedItems.slice(i, i + METADATA_BATCH_SIZE);
    
    const metadataPromises = batch.map(async (item) => {
      const metadataItemId = item.id;
      
      // Use cache to avoid fetching same metadata multiple times
      let itemMetadata = metadataCache.get(metadataItemId);
      if (itemMetadata === undefined) {
        itemMetadata = await fetchItemMetadata(metadataItemId, baseUri, offline);
        metadataCache.set(metadataItemId, itemMetadata);
      }
      
      return { item, metadata: itemMetadata };
    });
    
    const metadataResults = await Promise.all(metadataPromises);
    
    // Update items with metadata
    for (const { item, metadata } of metadataResults) {
      item.image = metadata?.image;
      item.description = metadata?.description;
      item.attributes = metadata?.attributes;
    }
  }

  // Sort by name then id for stable output
  aggregatedItems.sort((a, b) => (a.name.localeCompare(b.name) || a.id.localeCompare(b.id)));

  // Return aggregated results
  return [{
    address: `Aggregated (${addresses.length} addresses)`,
    items: aggregatedItems
  }];
}
