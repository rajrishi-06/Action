import { describe, expect, it } from 'vitest';
import { MIN_GAP, POSITION_GAP, positionBetween, renormalise } from './ordering';

const at = (...positions) => positions.map((position, index) => ({ id: `t${index}`, position }));

describe('positionBetween', () => {
  it('gives the first card in an empty column a starting position', () => {
    expect(positionBetween([{ id: 'a' }], 0)).toEqual({
      position: POSITION_GAP,
      needsRenormalise: false,
    });
  });

  it('places a card before the first neighbour', () => {
    const { position } = positionBetween(at(undefined, 1000), 0);
    expect(position).toBe(0);
  });

  it('places a card after the last neighbour', () => {
    const { position } = positionBetween(at(1000, undefined), 1);
    expect(position).toBe(2000);
  });

  it('takes the midpoint between two neighbours', () => {
    const { position, needsRenormalise } = positionBetween(at(1000, undefined, 2000), 1);
    expect(position).toBe(1500);
    expect(needsRenormalise).toBe(false);
  });

  it('keeps the card strictly between its neighbours', () => {
    const { position } = positionBetween(at(1000, undefined, 1001), 1);
    expect(position).toBeGreaterThan(1000);
    expect(position).toBeLessThan(1001);
  });

  it('asks for renormalisation once the gap collapses', () => {
    const { needsRenormalise } = positionBetween(at(1000, undefined, 1000 + MIN_GAP / 2), 1);
    expect(needsRenormalise).toBe(true);
  });

  it('asks for renormalisation before repeated inserts can collide', () => {
    // The real convergence path: each new card is dropped immediately after the
    // same anchor, so every insert halves the remaining gap. Left unchecked this
    // used to converge until two positions compared equal and cards appeared to
    // move on their own.
    const anchor = { id: 'anchor', position: 1000 };
    let next = { id: 'next', position: 2000 };
    let renormalisedAfter = null;

    for (let drop = 0; drop < 200; drop += 1) {
      const column = [anchor, { id: `drop-${drop}` }, next];
      const { position, needsRenormalise } = positionBetween(column, 1);

      if (needsRenormalise) {
        renormalisedAfter = drop;
        break;
      }

      // Every position handed out must be strictly inside the gap.
      expect(position).toBeGreaterThan(anchor.position);
      expect(position).toBeLessThan(next.position);

      next = { id: `drop-${drop}`, position };
    }

    // It must signal rather than silently hand out an indistinguishable position.
    expect(renormalisedAfter).not.toBeNull();
    // And it must stay usable for a realistic number of drops first.
    expect(renormalisedAfter).toBeGreaterThan(25);
  });
});

describe('renormalise', () => {
  it('spreads a column onto clean multiples', () => {
    const result = renormalise(at(0.1, 0.2, 0.3));
    expect(result).toEqual([
      { id: 't0', position: 1000 },
      { id: 't1', position: 2000 },
      { id: 't2', position: 3000 },
    ]);
  });

  it('writes only the rows that actually change', () => {
    // The first card is already correct, so it should not be rewritten.
    const result = renormalise(at(1000, 1500, 1600));
    expect(result.map((entry) => entry.id)).toEqual(['t1', 't2']);
  });

  it('returns nothing for an already-normal column', () => {
    expect(renormalise(at(1000, 2000, 3000))).toEqual([]);
  });

  it('handles an empty column', () => {
    expect(renormalise([])).toEqual([]);
  });
});
