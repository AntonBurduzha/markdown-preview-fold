// Remembers collapsed sections per document in the preview's localStorage.
// The preview webview keeps the same origin across reloads, so the data
// survives tab switches and restarts. Storage errors never break folding.

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface FoldStorage {
  load(doc: string): string[];
  save(doc: string, collapsed: Iterable<string>): void;
}

interface DocEntry {
  readonly collapsed: readonly string[];
  /** When the entry was last saved, for evicting the oldest documents. */
  readonly touched: number;
}

const STORAGE_KEY = 'markdownPreviewFold';
const VERSION = 1;
export const MAX_DOCS = 200;

export function createStorage(
  store: KeyValueStore | undefined,
  now: () => number = Date.now,
): FoldStorage {
  function read(): Map<string, DocEntry> {
    if (!store) return new Map();
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return new Map();
      const data: unknown = JSON.parse(raw);
      return new Map(isStoredData(data) ? Object.entries(data.docs) : []);
    } catch {
      return new Map();
    }
  }

  function write(docs: Map<string, DocEntry>): void {
    if (!store) return;
    try {
      store.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: VERSION, docs: Object.fromEntries(docs) }),
      );
    } catch {
      // Quota exceeded or storage blocked: folding still works for this session.
    }
  }

  return {
    load(doc) {
      return [...(read().get(doc)?.collapsed ?? [])];
    },
    save(doc, collapsed) {
      const docs = read();
      const keys = [...collapsed];
      if (keys.length === 0) docs.delete(doc);
      else docs.set(doc, { collapsed: keys, touched: now() });
      write(newest(docs, MAX_DOCS));
    },
  };
}

/** localStorage, or undefined where the sandbox blocks it. */
export function browserStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function newest(docs: Map<string, DocEntry>, max: number): Map<string, DocEntry> {
  if (docs.size <= max) return docs;
  const sorted = [...docs].sort(([, a], [, b]) => b.touched - a.touched);
  return new Map(sorted.slice(0, max));
}

function isStoredData(value: unknown): value is { docs: Record<string, DocEntry> } {
  if (typeof value !== 'object' || value === null) return false;
  const { version, docs } = value as { version?: unknown; docs?: unknown };
  if (version !== VERSION || typeof docs !== 'object' || docs === null) return false;
  return Object.values(docs).every(isDocEntry);
}

function isDocEntry(value: unknown): value is DocEntry {
  if (typeof value !== 'object' || value === null) return false;
  const { collapsed, touched } = value as { collapsed?: unknown; touched?: unknown };
  return (
    Array.isArray(collapsed) &&
    collapsed.every((key) => typeof key === 'string') &&
    typeof touched === 'number'
  );
}
