import { describe, expect, it } from 'vitest';
import { decodeCommand, encodeCommand, type FoldCommand } from '../../src/shared/protocol';

describe('command protocol', () => {
  it('round-trips a command', () => {
    const command: FoldCommand = {
      action: 'collapseAll',
      id: '6f1c2a0e-1b2c-4d5e-8f90-a1b2c3d4e5f6',
    };
    expect(decodeCommand(encodeCommand(command))).toEqual(command);
  });

  it('keeps colons inside the id', () => {
    expect(decodeCommand('expandAll:x:y')).toEqual({ action: 'expandAll', id: 'x:y' });
  });

  it.each([null, undefined, '', 'collapseAll', 'collapseAll:', 'fold:1', ':1'])(
    'rejects %j',
    (value) => {
      expect(decodeCommand(value)).toBeUndefined();
    },
  );
});
