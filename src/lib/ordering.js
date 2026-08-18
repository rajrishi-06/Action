/**
 * Fractional indexing for manual board order.
 *
 * Dropping a card writes one row instead of renumbering its column, which keeps
 * a drag to a single round trip. The cost is a precision ceiling: each drop into
 * the same gap halves it, and a double runs out of mantissa after ~50 of them.
 * `positionBetween` reports when that is about to happen so the caller can
 * renormalise the column instead of writing a colliding position.
 */

export const POSITION_GAP = 1000;

/**
 * Below this, the next midpoint would round to one of its neighbours and two
 * cards would compare equal. Well clear of the ~2.2e-16 where doubles actually
 * collapse, so renormalisation happens long before ordering can visibly break.
 */
export const MIN_GAP = 1e-6;

/**
 * Where a card dropped at `index` should sit.
 *
 * @param {{position?: number}[]} list Column contents *after* the move.
 * @param {number} index Where the card now sits in that list.
 * @returns {{ position: number, needsRenormalise: boolean }}
 */
export function positionBetween(list, index) {
  const before = list[index - 1]?.position;
  const after = list[index + 1]?.position;

  if (before === undefined && after === undefined) {
    return { position: POSITION_GAP, needsRenormalise: false };
  }
  if (before === undefined) {
    return { position: after - POSITION_GAP, needsRenormalise: false };
  }
  if (after === undefined) {
    return { position: before + POSITION_GAP, needsRenormalise: false };
  }

  const gap = after - before;

  // Out of room between these two neighbours: the caller must rewrite the
  // column rather than persist a position that cannot be distinguished.
  if (gap <= MIN_GAP) {
    return { position: (before + after) / 2, needsRenormalise: true };
  }

  return { position: before + gap / 2, needsRenormalise: false };
}

/**
 * Evenly spaced positions for a whole column, used to recover from a collapsed
 * gap. Returns only the rows whose position actually changes, so a
 * renormalisation writes as little as possible.
 *
 * @param {{id: string, position?: number}[]} list Column in its intended order.
 * @returns {{id: string, position: number}[]}
 */
export function renormalise(list) {
  return list
    .map((task, index) => ({ id: task.id, position: (index + 1) * POSITION_GAP }))
    .filter((entry, index) => list[index].position !== entry.position);
}
