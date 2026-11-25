import { describe, expect, it } from 'vitest';
import { createStorage, MAX_DOCS, type KeyValueStore } from '../../src/preview/storage';

const KEY = 'markdownPreviewFold';
const A = 'file:///notes/a.md';
const B = 'file:///notes/b.md';

function mapStore(initial?: string): KeyValueStore & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(KEY, initial);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('createStorage', () => {
  it('returns nothing for an unknown document', () => {
    expect(createStorage(mapStore()).load(A)).toEqual([]);
  });

  it('saves and loads the collapsed keys per document', () => {
    const store = mapStore();
    createStorage(store).save(A, new Set(['Guide#0', 'Guide#0 › Setup#0']));
    const reopened = createStorage(store);
    expect(reopened.load(A)).toEqual(['Guide#0', 'Guide#0 › Setup#0']);
    expect(reopened.load(B)).toEqual([]);
  });

  it('removes a document when nothing is collapsed', () => {
    const store = mapStore();
    const storage = createStorage(store);
    storage.save(A, ['Guide#0']);
    storage.save(A, []);
    expect(store.data.get(KEY)).toBe('{"version":1,"docs":{}}');
  });

  it.each([
    'not json',
    JSON.stringify({ version: 2, docs: { [A]: { collapsed: ['Guide#0'], touched: 1 } } }),
    JSON.stringify({ version: 1, docs: { [A]: { collapsed: [42], touched: 1 } } }),
  ])('ignores unexpected data: %s', (raw) => {
    const store = mapStore(raw);
    const storage = createStorage(store);
    expect(storage.load(A)).toEqual([]);
    storage.save(B, ['Notes#0']);
    expect(createStorage(store).load(B)).toEqual(['Notes#0']);
  });

  it('keeps working when the store throws', () => {
    const storage = createStorage({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => {
      storage.save(A, ['Guide#0']);
    }).not.toThrow();
    expect(storage.load(A)).toEqual([]);
  });

  it('works without a store', () => {
    const storage = createStorage(undefined);
    expect(() => {
      storage.save(A, ['Guide#0']);
    }).not.toThrow();
    expect(storage.load(A)).toEqual([]);
  });

  it('keeps only the most recently saved documents', () => {
    let time = 0;
    const store = mapStore();
    const storage = createStorage(store, () => ++time);
    for (let i = 0; i <= MAX_DOCS; i++) storage.save(`file:///notes/${String(i)}.md`, ['A#0']);
    expect(storage.load('file:///notes/0.md')).toEqual([]);
    expect(storage.load('file:///notes/1.md')).toEqual(['A#0']);
    expect(storage.load(`file:///notes/${String(MAX_DOCS)}.md`)).toEqual(['A#0']);
  });
});
