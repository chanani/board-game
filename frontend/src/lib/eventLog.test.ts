import { describe, expect, it } from 'vitest';
import { LOG_LIMIT, prependLog } from './eventLog';

describe('prependLog', () => {
  it('진행 기록은 새 것을 앞에 붙이고 게임 동안 200개까지 남긴다', () => {
    const entry = (id: number) => ({ id, at: id, kind: 'other' as const, text: String(id) });
    const old = Array.from({ length: 199 }, (_, index) => entry(index));
    const next = prependLog(old, [entry(1000), entry(1001)]);
    expect(LOG_LIMIT).toBe(200);
    expect(next).toHaveLength(200);
    expect(next[0].id).toBe(1000);
    expect(next.at(-1)?.id).toBe(197);
  });
});
