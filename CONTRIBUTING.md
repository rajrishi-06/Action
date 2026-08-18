# Contributing

Thanks for taking a look.

## Getting set up

```bash
npm install
cp .env.example .env    # add your Supabase details
npm run dev
```

Follow the README's Quick start for the Supabase side. Without it the app boots
into a setup screen rather than failing, so you will know immediately.

## Before you open a pull request

```bash
npm run check
```

That runs lint, tests and a production build — the same gate CI applies.

## How the code is organised

- **Pure logic goes in `src/lib/`** and takes its inputs as arguments, including
  the clock (`parseTaskInput(input, { now })`). If something is worth testing, it
  belongs here, and it should need no mocks and no DOM.
- **State transitions go through `src/lib/taskReducer.js`.** Optimistic updates,
  rollback and undo are data, not scattered `setState` calls.
- **Database columns are mapped in one place**, `src/lib/taskMapper.js`. Adding a
  field means adding it to `COLUMNS` there — not hand-writing a partial update
  object at the call site.
- **Every interactive element is a real control with an accessible name.** Icon
  buttons use `IconButton`, which requires a `label`. `jsx-a11y` runs in CI.

## Tests

Vitest with Testing Library. Aim for behaviour, not implementation:

```js
// good — describes what a user experiences
expect(screen.getByRole('checkbox', { name: 'Mark "Buy milk" as done' })).toBeInTheDocument();

// avoid — couples the test to internals
expect(wrapper.state.isChecked).toBe(false);
```

Bug fixes should come with a test that fails without the fix.

## Adding a chart

Charts follow a fixed method: pick the form from the data's job, assign colour
by that job, then **validate the palette** rather than eyeballing it. Colours
live as CSS variables in `src/index.css` (`--chart-*`, `--heat-*`) with separate
values chosen for each theme, not flipped automatically. Any chart with two or
more series needs a legend and a table view.
