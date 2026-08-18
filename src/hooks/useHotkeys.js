import { useEffect, useRef } from 'react';

const isEditable = (element) => {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    element.isContentEditable === true
  );
};

/** Normalise a keyboard event into "mod+k" / "shift+?" / "g" form. */
function eventToCombo(event) {
  const parts = [];
  if (event.metaKey || event.ctrlKey) parts.push('mod');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  parts.push(key);
  return parts.join('+');
}

/**
 * Global keyboard shortcuts.
 *
 * @param {Record<string, (event: KeyboardEvent) => void>} bindings
 *   Map of combo -> handler, e.g. `{ 'mod+k': open, '?': showHelp }`.
 * @param {{ enabled?: boolean, allowInInputs?: string[] }} [options]
 *   `allowInInputs` lists combos that should still fire while typing (Escape,
 *   Cmd+K and friends); everything else is suppressed inside form fields so
 *   shortcuts never eat a keystroke meant for a text box.
 */
export function useHotkeys(bindings, { enabled = true, allowInInputs = ['escape', 'mod+k', 'mod+enter'] } = {}) {
  // Keep handlers in a ref so callers can pass inline objects without
  // re-binding the listener on every render.
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      const combo = eventToCombo(event);
      const handler = ref.current[combo] ?? ref.current[event.key.toLowerCase()];
      if (!handler) return;
      if (isEditable(event.target) && !allowInInputs.includes(combo)) return;
      handler(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, allowInInputs.join('|')]);
}

/** Platform-correct label for the modifier key. */
export const modKeyLabel =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '') ? '⌘' : 'Ctrl';
