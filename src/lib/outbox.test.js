import { beforeEach, describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { clear, count, drain, enqueue, pending, remove } from './outbox';

const mutation = (overrides = {}) => ({
  kind: 'update',
  id: 'task-1',
  payload: { title: 'Changed' },
  userId: 'user-1',
  ...overrides,
});

beforeEach(async () => {
  await clear();
});

describe('outbox queueing', () => {
  it('stores a mutation and reports it as pending', async () => {
    await enqueue(mutation());
    expect(await count('user-1')).toBe(1);
  });

  it('preserves insertion order, which replay depends on', async () => {
    await enqueue(mutation({ kind: 'insert', id: 'a' }));
    await enqueue(mutation({ kind: 'update', id: 'a' }));
    await enqueue(mutation({ kind: 'delete', id: 'a' }));

    expect((await pending('user-1')).map((entry) => entry.kind)).toEqual([
      'insert',
      'update',
      'delete',
    ]);
  });

  it('scopes the queue to one user', async () => {
    await enqueue(mutation({ userId: 'user-1' }));
    await enqueue(mutation({ userId: 'user-2' }));

    expect(await count('user-1')).toBe(1);
    expect(await count('user-2')).toBe(1);
  });

  it('removes a single entry', async () => {
    await enqueue(mutation());
    const [entry] = await pending('user-1');
    await remove(entry.seq);
    expect(await count('user-1')).toBe(0);
  });
});

describe('outbox drain', () => {
  it('sends everything when the connection is healthy', async () => {
    await enqueue(mutation({ id: 'a' }));
    await enqueue(mutation({ id: 'b' }));

    const send = vi.fn().mockResolvedValue({ ok: true });
    const result = await drain('user-1', send);

    expect(result).toEqual({ sent: 2, dropped: 0, remaining: 0 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('replays in queued order', async () => {
    await enqueue(mutation({ kind: 'insert', id: 'a' }));
    await enqueue(mutation({ kind: 'update', id: 'a' }));

    const seen = [];
    await drain('user-1', async (entry) => {
      seen.push(entry.kind);
      return { ok: true };
    });

    expect(seen).toEqual(['insert', 'update']);
  });

  it('stops at a retriable failure so ordering is never broken', async () => {
    await enqueue(mutation({ kind: 'insert', id: 'a' }));
    await enqueue(mutation({ kind: 'update', id: 'a' }));
    await enqueue(mutation({ kind: 'delete', id: 'a' }));

    // The second entry cannot be sent yet. The third must not jump ahead of it.
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, retriable: true });

    const result = await drain('user-1', send);

    expect(result.sent).toBe(1);
    expect(result.remaining).toBe(2);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('treats a thrown error as retriable and stops', async () => {
    await enqueue(mutation({ id: 'a' }));
    await enqueue(mutation({ id: 'b' }));

    const send = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await drain('user-1', send);

    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(2);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('drops a permanently rejected entry rather than blocking the queue', async () => {
    await enqueue(mutation({ id: 'rejected' }));
    await enqueue(mutation({ id: 'fine' }));

    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, retriable: false })
      .mockResolvedValueOnce({ ok: true });

    const result = await drain('user-1', send);

    expect(result).toEqual({ sent: 1, dropped: 1, remaining: 0 });
  });

  it('is a no-op on an empty queue', async () => {
    const send = vi.fn();
    expect(await drain('user-1', send)).toEqual({ sent: 0, dropped: 0, remaining: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it('leaves another user’s queue untouched', async () => {
    await enqueue(mutation({ userId: 'user-1' }));
    await enqueue(mutation({ userId: 'user-2' }));

    await drain('user-1', async () => ({ ok: true }));

    expect(await count('user-1')).toBe(0);
    expect(await count('user-2')).toBe(1);
  });
});
