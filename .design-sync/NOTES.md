# design-sync notes — @byearlybird/components

Repo-specific findings for future syncs. Format: symptom → root cause → fix.
`[GENERAL]` marks anything that applies beyond one component.

## Setup

- Run every converter command **from the repo root** (`/Users/nickmurphy/Code/sdk`), not from
  `packages/components` — the converter resolves `.design-sync/` from the repo root.
- `DesignSync(finalize_plan)` resolves `localDir` from the _session_ cwd, not the repo root. Pass the
  **absolute** path (`/Users/nickmurphy/Code/sdk/ds-bundle`); a relative `./ds-bundle` fails with ENOENT
  when the session cwd is `packages/components`.
- Build order: `pnpm -F "@byearlybird/components..." build` (trailing `...` builds workspace deps)
  **before** the reference storybook, since `dist/` can lag `src/`.
- Reference storybook: `cd packages/components && npx storybook build -c .storybook -o "$(git rev-parse --show-toplevel)/.design-sync/sb-reference"`.

## `[GENERAL]` config paths are package-relative, not repo-relative

Symptom → `! cssEntry: … not found — skipped` and `! extraFonts: … not found — skipped` even though both
paths existed from the repo root.
Root cause → `cfg.*` path fields resolve relative to the **package dir** (`packages/components`);
`workspaceRoot` is only the containment bound, not the base.
Fix → `"cssEntry": "./dist/style.css"`, `"extraFonts": ["./node_modules/@fontsource-variable/karla/index.css"]`.

## `[GENERAL]` Karla font must ship via `extraFonts`

Symptom → `[FONT_MISSING]`; the font is invisible to the compare oracle (both panels would fall back
identically), so it can never be caught by grading.
Root cause → `tokens.css` declares `--eb-font-family: "Karla Variable", …` but neither `dist/style.css`
nor `dist/tokens.css` ships an `@font-face`. The font is a **devDependency**
(`@fontsource-variable/karla`) imported only by `.storybook/preview.ts` — i.e. it reaches Storybook but
would never reach a design-system consumer.
Fix → `cfg.extraFonts` → the fontsource `index.css`, which carries both `@font-face` rules with
relative `./files/*.woff2` urls the converter copies. Verified positively in the Button raw
screenshots: the letterforms are Karla on both panels, not a system fallback.

## `[FONT_MISSING] "Karla"` is triaged and accepted — do not chase it

The warning names `"Karla"`, **not** `"Karla Variable"`. The stack is
`"Karla Variable", "Karla", ui-sans-serif, system-ui, sans-serif`. `Karla Variable` ships and always
resolves first, so the static `"Karla"` fallback is unreachable. Shipping an alias `@font-face` was
considered and rejected: it would map a static family name onto the variable file for a slot that never
renders. **Accepted substitute, not an open defect.**

## `[GENERAL]` `.storybook/preview.ts` decorators cannot bundle

Symptom → `! preview decorator bundle failed: No loader is configured for ".woff2"`.
Root cause → the decorator bundler's esbuild loader map is **hardcoded** to `{'.js','.json'}`
(`lib/source-storybook.mjs`); `preview.ts` imports `@fontsource-variable/karla` (→ woff2) and
`tokens.css`. `cfg.storyImports.loaders` does **not** reach this bundle — no config knob does.
Fix → **none needed, and `cfg.provider` is deliberately unset.** This is a pure-CSS design system with
no React provider to point at, and the decorators supply nothing previews miss:

- the Karla font → now shipped via `cfg.extraFonts`;
- `tokens.css` → already in the `styles.css` @import closure;
- `data-theme="light"` on `<html>` → `tokens.css` defines the full light palette on bare
  `:where(:root)`, so the attribute is redundant for the light theme.
  Confirmed by grading: previews match the reference, which _does_ set `data-theme`.
  **Setting `cfg.provider` here would fail `[PROVIDER_UNEXPORTED]`** — there is no provider export.

## `[GENERAL]` interaction-test stories render a post-`play` state in Storybook

Several stories use `play()` with `storybook/test` (`userEvent.tab()`, `waitFor`, …). Storybook's
reference render shows the state _after_ the interaction; previews render the resting state by design.
Grade these on the component, not the induced state — see `Button/Disabled Focusable`, graded `close`
for exactly this reason. **Never "fix" one by neutralizing the story.**

## Chart story titles don't match export names

`Components/Charts/Bar|Line|Pie` vs exports `BarChart`/`LineChart`/`PieChart` → `cfg.titleMap`.
Without it: `[TITLE_UNMAPPED]` and the three chart components drop out of the sync.

## Charts live on a second entry

`BarChart`/`LineChart`/`PieChart` are exported from `dist/charts.mjs`, not `dist/index.mjs`
→ `cfg.extraEntries: ["./dist/charts.mjs"]`, or they are missing from `window.EarlyBirdComponents`
and every chart preview renders blank. `recharts` is an external in `dist/` and gets inlined into
`_ds_bundle.js` by the converter.

## `[GRID_OVERFLOW]` card modes

Applied via `cfg.overrides` (presentation-only — targeted `preview-rebuild.mjs`, grades carry):

- `wide` → `cardMode: "column"`: `BarChart`, `LineChart`, `PieChart`, `Card`
- `escape` (fixed/portal) → `cardMode: "single"` + `primaryStory: "Default"`: `Combobox`, `Select`

`Dialog`, `Drawer`, and `Menu` are portal components but did **not** flag — their stories render in the
closed/trigger-only state. If a future story opens one by default, expect an `escape` flag and give it
`cardMode: "single"` too.

## Re-sync risks

What the next run should watch, and why:

1. **The owned preview `.design-sync/previews/Card.tsx` is tied to two upstream paths.** It imports
   `../../packages/components/src/components/Card/recording-mic.jpg` and mirrors
   `Card.stories.tsx`'s JSX by hand. If the story's markup changes, or the image is renamed/moved, the
   owned preview silently keeps rendering the OLD composition — nothing machine-deletes owned previews,
   and they shadow the generated twin. `[STORY_CHANGED]` on Card is the signal to re-mirror it.
2. **Six `close` grades are accepted, not open defects** — all one cause (`play()`-induced state):
   `Button/Disabled Focusable`, `Textarea/Default`, `Dialog/Default`, `Checkbox/Checked`,
   `Switch/Checked`, `Radio/Default`, `Input/With Action`, `Combobox/Default`, `Menu/Default`,
   `Drawer/Default`, `Drawer/Swipeable From Bottom`. Do **not** try to "fix" these by faking state in
   owned previews. If a future run sees them flip to `mismatch`, that is a real regression, not this.
3. **`Drawer/Swipeable From Bottom` is the weakest card** — its reference shows an OPEN drawer (play
   opens it and never closes it) while the card shows the closed trigger. The durable fix is upstream:
   a story rendering the open state declaratively via base-ui's `defaultOpen`
   (`DrawerProps = BaseDrawer.Root.Props`). Same opportunity for Dialog/Menu/Select/Combobox cards.
4. **`[FONT_MISSING] "Karla"` will print on every future run.** Triaged and accepted (see above) — it is
   the unreachable static fallback, not the shipped `Karla Variable`. Do not "fix" it.
5. **The decorator bundle will keep failing** on `.woff2` every run. Expected and harmless here; see the
   section above before spending time on it. It becomes real only if `.storybook/preview.ts` ever grows
   an actual React provider — then previews WOULD lose context and `cfg.provider` becomes mandatory.
6. **Only partially verified:** no `[STORY_CAP]` was hit (max 6 stories/component; Input's 5 is the
   largest), so every story was captured. Grading used image-judged verdicts throughout rather than
   sibling-trust, except where noted.
7. **Build assumptions:** node 24.19.0, pnpm 11.17.0 (repo pins 11.20.0 — warn only). `recharts` is an
   external in `dist/charts.mjs` and gets inlined into `_ds_bundle.js` (bundle ≈2.1 MB). No CDN-fetched
   assets — the one remote-looking host, `ds-preview.invalid`, was the `import.meta.url` bug in §Card,
   now fixed. A future `[ASSETS_BLOCKED]` naming a _real_ host means something new started fetching.
8. **`storybook-static/` at `packages/components/` is stale and unrelated** (gitignored, from Aug 7).
   The reference this sync uses is `.design-sync/sb-reference/`. Don't confuse them.
