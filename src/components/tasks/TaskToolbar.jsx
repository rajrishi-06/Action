import { cloneElement, useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Check, Filter, Search, X } from 'lucide-react';
import { SORT_OPTIONS, useTodo } from '../../context/TodoContext';
import { PRIORITIES, PRIORITY_META } from '../../lib/taskModel';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { cn } from '../../lib/cn';
import { Button, IconButton } from '../ui/Button';
import { Badge, Kbd } from '../ui/primitives';

/** Small dropdown that closes on outside click and Escape. */
function Popover({ trigger, children, align = 'right', label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Clone the trigger so the toggle lands on the real <button> element rather
  // than a wrapper div — a div with onClick is unreachable by keyboard.
  const triggerElement = cloneElement(trigger, {
    onClick: () => setOpen((current) => !current),
    'aria-expanded': open,
    'aria-haspopup': 'menu',
  });

  return (
    <div ref={ref} className="relative">
      {triggerElement}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute z-30 mt-2 w-56 rounded-xl border border-line bg-surface-raised p-1.5 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-sunken"
    >
      {children}
      {active && <Check className="h-3.5 w-3.5 flex-shrink-0 text-brand-600" />}
    </button>
  );
}

/**
 * Search, filter and sort controls.
 *
 * None of this existed before: the context carried a `searchQuery` that no
 * component ever wrote to, and the only filter was three sidebar buttons.
 */
export function TaskToolbar({ searchRef }) {
  const { filters, setFilter, resetFilters, hasActiveFilters, allTags, visibleTasks } = useTodo();
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchDraft, 200);

  // Push the debounced value into the shared filter state.
  useEffect(() => {
    setFilter({ search: debouncedSearch });
  }, [debouncedSearch, setFilter]);

  // Keep the field in step when filters are cleared from elsewhere.
  useEffect(() => {
    if (filters.search === '' && searchDraft !== '') setSearchDraft('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const togglePriority = (priority) =>
    setFilter({
      priorities: filters.priorities.includes(priority)
        ? filters.priorities.filter((item) => item !== priority)
        : [...filters.priorities, priority],
    });

  const toggleTag = (tag) =>
    setFilter({
      tags: filters.tags.includes(tag) ? filters.tags.filter((item) => item !== tag) : [...filters.tags, tag],
    });

  const activeFilterCount = filters.priorities.length + filters.tags.length + (filters.showCompleted ? 1 : 0);
  const sortLabel = SORT_OPTIONS.find((option) => option.id === filters.sort)?.label ?? 'Smart';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-16 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-500"
          />
          {searchDraft ? (
            <button
              type="button"
              onClick={() => setSearchDraft('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-subtle hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
          )}
        </div>

        <Popover
          label="Filter tasks"
          trigger={
            <Button size="sm" variant={activeFilterCount ? 'primary' : 'secondary'}>
              <Filter className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[11px]">{activeFilterCount}</span>
              )}
            </Button>
          }
        >
          <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
            Priority
          </p>
          {PRIORITIES.map((priority) => (
            <MenuItem
              key={priority}
              active={filters.priorities.includes(priority)}
              onClick={() => togglePriority(priority)}
            >
              <span className="inline-flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', PRIORITY_META[priority].dot)} />
                {PRIORITY_META[priority].label}
              </span>
            </MenuItem>
          ))}

          {allTags.length > 0 && (
            <>
              <p className="px-2.5 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                Tags
              </p>
              <div className="max-h-40 overflow-y-auto scrollbar-thin">
                {allTags.map(({ tag, count }) => (
                  <MenuItem key={tag} active={filters.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                    <span className="truncate">#{tag}</span>
                    <span className="ml-auto mr-1 text-xs text-ink-subtle">{count}</span>
                  </MenuItem>
                ))}
              </div>
            </>
          )}

          <div className="mt-1 border-t border-line pt-1">
            <MenuItem
              active={filters.showCompleted}
              onClick={() => setFilter({ showCompleted: !filters.showCompleted })}
            >
              Show completed
            </MenuItem>
          </div>
        </Popover>

        <Popover
          label="Sort tasks"
          trigger={
            <Button size="sm" variant="secondary">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{sortLabel}</span>
            </Button>
          }
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem
              key={option.id}
              active={filters.sort === option.id}
              onClick={() => setFilter({ sort: option.id })}
            >
              {option.label}
            </MenuItem>
          ))}
        </Popover>

        {hasActiveFilters && (
          <IconButton label="Clear all filters" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4" />
          </IconButton>
        )}

        <span className="ml-auto whitespace-nowrap text-xs text-ink-subtle" aria-live="polite">
          {visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Active filters, each individually removable. */}
      {(filters.priorities.length > 0 || filters.tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.priorities.map((priority) => (
            <Badge key={priority} tone="brand">
              {PRIORITY_META[priority].label}
              <button type="button" onClick={() => togglePriority(priority)} aria-label={`Remove ${priority} filter`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.tags.map((tag) => (
            <Badge key={tag} tone="brand">
              #{tag}
              <button type="button" onClick={() => toggleTag(tag)} aria-label={`Remove ${tag} filter`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
