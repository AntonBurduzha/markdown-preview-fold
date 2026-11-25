import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_TTL_MS, CommandChannel } from '../../src/commands';

function channel() {
  let next = 0;
  const refresh = vi.fn(() => Promise.resolve());
  const instance = new CommandChannel({ refresh, createId: () => `id${String(++next)}` });
  return { instance, refresh };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CommandChannel', () => {
  it('holds the command and refreshes the previews', async () => {
    const { instance, refresh } = channel();
    await instance.send('collapseAll');
    expect(instance.current).toBe('collapseAll:id1');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('drops the command after the TTL', async () => {
    const { instance } = channel();
    await instance.send('expandAll');
    vi.advanceTimersByTime(COMMAND_TTL_MS - 1);
    expect(instance.current).toBe('expandAll:id1');
    vi.advanceTimersByTime(1);
    expect(instance.current).toBeUndefined();
  });

  it('gives each command a new id and restarts the TTL', async () => {
    const { instance } = channel();
    await instance.send('collapseAll');
    vi.advanceTimersByTime(COMMAND_TTL_MS - 1);
    await instance.send('collapseAll');
    expect(instance.current).toBe('collapseAll:id2');
    vi.advanceTimersByTime(COMMAND_TTL_MS - 1);
    expect(instance.current).toBe('collapseAll:id2');
  });

  it('forgets the command on dispose', async () => {
    const { instance } = channel();
    await instance.send('collapseAll');
    instance.dispose();
    expect(instance.current).toBeUndefined();
  });
});
