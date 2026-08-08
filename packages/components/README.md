# @byearlybird/components

Reusable React components by Early Bird, built with TypeScript and CSS Modules.

Form controls, overlays, and charts built on [Base UI](https://base-ui.com), styled through a
documented set of `--eb-` custom properties. Import the stylesheet once, override the tokens you
care about, and the whole set follows along.

> [!NOTE]
> **Status: Beta.** The public API is mostly settled, but I'm not calling it done yet. Breaking
> changes are still possible before 1.0, and I'll call them out in the changelog rather than ship
> them quietly.

- [Install](#install)
- [Quickstart](#quickstart)
- [Form controls](#form-controls)
- [Overlays](#overlays)
- [Design tokens](#design-tokens)
- [Charts](#charts)
- [Contributing](#contributing)

## Requirements

- **React** 19.2 or later (React 19 only).
- **ESM only.** There's no CommonJS build.
- **Browsers:** the current and previous release of Chrome, Edge, Firefox, and Safari. The styles
  lean on `color-mix()` and CSS custom properties, so browsers without those aren't supported.
- **Accessibility target:** WCAG 2.2 Level AA. Interactive controls meet the 3:1 non-text contrast
  and 24×24px target-size minimums, and chart series meet 3:1 in distinct lightness tiers.

> [!IMPORTANT]
> Charts separate series by color and legend rather than by shape or dash pattern. Keep the legend
> visible, and try not to lean on color as the only cue in your own labeling.

## Install

```bash
pnpm add @byearlybird/components
```

`@byearlybird/components` works with React 19.2 and later React 19 releases. If your app doesn't
already have React installed, grab it too:

```bash
pnpm add react react-dom
```

Karla is the preferred font here. The font files aren't bundled with the library, so install them in
your app:

```bash
pnpm add @fontsource-variable/karla
```

## Quickstart

Import the stylesheet once in your root entry or layout, then use the components:

```tsx
import "@fontsource-variable/karla";
import "@byearlybird/components/style.css";
import { Button, ButtonIcon, Input, InputGroup, InputIcon } from "@byearlybird/components";
import { SearchIcon } from "./icons";

export function SearchForm() {
  return (
    <form>
      <InputGroup>
        <InputIcon>
          <SearchIcon />
        </InputIcon>
        <Input aria-label="Search" placeholder="Search" />
      </InputGroup>
      <Button>
        <ButtonIcon>
          <SearchIcon />
        </ButtonIcon>
        Search
      </Button>
    </form>
  );
}
```

The component source uses CSS Modules, and the package exposes the compiled, scoped stylesheet as
this stable CSS entry. Storybook has every component and its props if you want to poke around. See
[Contributing](#contributing) to run it locally.

## Form controls

Here's a fuller example, with the input, selection, and menu families composing together:

```tsx
import "@fontsource-variable/karla";
import {
  Button,
  ButtonIcon,
  Checkbox,
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxLeadingIcon,
  ComboboxList,
  ComboboxTrigger,
  Input,
  InputAction,
  InputGroup,
  InputIcon,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Radio,
  RadioGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectLeadingIcon,
  SelectList,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@byearlybird/components";
import "@byearlybird/components/style.css";
import { PaletteIcon, SearchIcon } from "./icons";

export function Example() {
  return (
    <form>
      <InputGroup>
        <InputIcon>
          <SearchIcon />
        </InputIcon>
        <Input aria-label="Search" placeholder="Search" />
        <InputAction type="submit">Search</InputAction>
      </InputGroup>
      <Button>
        <ButtonIcon>
          <SearchIcon />
        </ButtonIcon>
        Find another
      </Button>
      <Textarea aria-label="Notes" name="notes" placeholder="Add notes" />
      <label>
        <Checkbox name="updates" />
        Send me updates
      </label>
      <RadioGroup aria-label="Theme preference" defaultValue="system" name="theme-preference">
        <label>
          <Radio value="system" />
          System
        </label>
        <label>
          <Radio value="dark" />
          Dark
        </label>
      </RadioGroup>
      <label>
        <Switch name="compact" />
        Compact mode
      </label>
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <MenuItem>Duplicate</MenuItem>
          <MenuItem>Rename</MenuItem>
        </MenuContent>
      </Menu>
      <Combobox items={fruits} name="fruit">
        <ComboboxInputGroup>
          <ComboboxLeadingIcon>
            <SearchIcon />
          </ComboboxLeadingIcon>
          <ComboboxInput aria-label="Fruit" placeholder="Search for a fruit" />
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>No fruits found.</ComboboxEmpty>
          <ComboboxList>
            {(fruit) => (
              <ComboboxItem key={fruit.value} value={fruit}>
                {fruit.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <Select items={themes} name="theme">
        <SelectTrigger aria-label="Theme">
          <SelectLeadingIcon>
            <PaletteIcon />
          </SelectLeadingIcon>
          <SelectValue placeholder="Select a theme" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectList>
            {themes.map((theme) => (
              <SelectItem key={theme.value} value={theme.value}>
                {theme.label}
              </SelectItem>
            ))}
          </SelectList>
        </SelectContent>
      </Select>
    </form>
  );
}

const themes = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

const fruits = [
  { label: "Apple", value: "apple" },
  { label: "Mango", value: "mango" },
];
```

A few composition rules worth knowing:

- `Button`, `Input`, and the Select and Combobox parts extend their matching Base UI primitives,
  including state-aware `className`, Field integration, and ref support.
- Wrap `Input` in `InputGroup` when icons or other adornments need to sit next to it.
- `SelectLeadingIcon` and `ComboboxLeadingIcon` give you the same leading-icon composition for
  selection controls.
- `Textarea` extends the native textarea props.

`CardTitle` renders an `h2` by default. Set `as` to whatever heading level fits the surrounding
document outline, so cards don't break the page's heading order:

```tsx
<Card>
  <CardHeader>
    <CardTitle as="h3">Recent activity</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

## Overlays

Dialog and Drawer come with themed backdrops, surfaces, titles, descriptions, triggers,
and close controls. Their `Content` components handle the standard portal, backdrop,
viewport, and popup structure for you. Drawer also supports Base UI's swipe
directions, snap points, nested drawers, and virtual keyboard provider.

```tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@byearlybird/components";

<Dialog>
  <DialogTrigger>Open dialog</DialogTrigger>
  <DialogContent>
    <DialogTitle>Edit profile</DialogTitle>
    <DialogDescription>Update your public profile details.</DialogDescription>
    <DialogClose>Close</DialogClose>
  </DialogContent>
</Dialog>;

<Drawer swipeDirection="right">
  <DrawerTrigger>Open drawer</DrawerTrigger>
  <DrawerContent>
    <DrawerTitle>Account settings</DrawerTitle>
    <DrawerDescription>Update your account details.</DrawerDescription>
    <DrawerClose>Close</DrawerClose>
  </DrawerContent>
</Drawer>;
```

## Design tokens

The tokens ship separately from the component styles. If you just need the shared tokens,
there's a standalone entry for that:

```css
@import "@byearlybird/components/tokens.css";
```

`@byearlybird/components/style.css` already includes these tokens, so if you're using the
components, just import the component stylesheet.

Every custom property the library defines is prefixed `--eb-`, and all of them are supported
public API. Read them, compose them in `calc()`, or override them. They're meant to be built
on, not just themed. The library declares them at `:where(:root)`, so your own `:root` rule
always wins without any specificity tricks.

```css
.my-toolbar {
  gap: var(--eb-size-2);
  padding: var(--eb-size-3) var(--eb-size-4);
  font-size: var(--eb-font-size-body);
  border-block-end: var(--eb-border-width) solid var(--eb-color-border);
}
```

### The token contract

| Group      | Tokens                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Layout     | `--eb-border-width`, `--eb-size-1` … `--eb-size-10` (each step is 4px)                                                                                                                                 |
| Typography | `--eb-font-family`, `--eb-font-size-body`, `--eb-font-size-title`, `--eb-font-weight-regular`, `--eb-font-weight-semibold`, `--eb-line-height-none`, `--eb-line-height-normal`                         |
| Color      | `--eb-color-primary`, `--eb-color-primary-text`, `--eb-color-background`, `--eb-color-text`, `--eb-color-text-muted`, `--eb-color-border`, `--eb-color-muted`, `--eb-color-danger`, `--eb-color-scrim` |
| Charts     | `--eb-chart-series-1`, `--eb-chart-series-2`, `--eb-chart-series-3`                                                                                                                                    |
| Shape      | `--eb-radius-surface`, `--eb-radius-input`, `--eb-radius-button`                                                                                                                                       |
| Elevation  | `--eb-shadow-raised-content`, `--eb-shadow-elevated-content`                                                                                                                                           |
| Motion     | `--eb-motion-duration`, `--eb-motion-easing-standard`, `--eb-motion-easing-out`                                                                                                                        |

**Compatibility policy.** Adding a token is a minor release. Renaming or removing one, or
changing what it means, is a breaking change and will show up in the changelog. Adjusting a
token's _value_ (a shade, a duration) is just a minor release, so pin the value yourself if
your design depends on an exact number. `tests/tokens.test.ts` enforces the set and fails
the build if a token gets dropped, renamed, or added without being documented here.

```css
:root {
  --eb-color-primary: #252523;
  --eb-color-primary-text: #faf9f6;
  --eb-color-background: #faf9f6;
  --eb-color-text: #252523;
  --eb-color-text-muted: color-mix(in srgb, var(--eb-color-text) 65%, transparent);
  --eb-color-border: #939088;
  --eb-color-muted: #e3e1da;
  --eb-color-danger: #b91c1c;
  --eb-color-scrim: #000;
  --eb-font-family: "Karla Variable", "Karla", ui-sans-serif, system-ui, sans-serif;
  --eb-radius-surface: 2px;
  --eb-radius-input: 9999px;
  --eb-radius-button: 9999px;
  --eb-motion-duration: 200ms;
  --eb-motion-easing-standard: ease;
  --eb-motion-easing-out: ease-out;
}
```

Use `--eb-color-danger` for error and destructive states. It's the border color the Input
and Textarea error styles already use. `--eb-color-scrim` is the base color for modal
backdrops and it's black in both themes on purpose, so compose it with `color-mix()`
instead of overriding it to a theme color.

`--eb-color-text-muted` is for secondary content like timestamps, metadata, and
supporting icons. It derives a translucent color from the active text color, so it
follows both light and dark themes while keeping the color of whatever surface is
underneath. For muted surfaces themselves, use `--eb-color-muted`.

> [!IMPORTANT]
> Since `--eb-color-text-muted` is translucent, its contrast depends on whatever sits
> behind it. Against the default background it measures 4.77:1 in light mode and 5.89:1
> in dark mode. If you override `--eb-color-text` or `--eb-color-background`, or put
> muted text on a `--eb-color-muted` surface, re-check it against the 4.5:1 minimum.

The standard motion duration is the default for control feedback, visual-state
changes, and larger surface or shape transitions. Pair it with the standard easing
for general state changes, or reach for the out easing when movement or expansion
should settle into place.

Components follow the system color-scheme preference by default. Set `data-theme` on
the document root or any containing element to pick a mode explicitly:

```html
<html data-theme="dark">
  <!-- Components use the dark theme -->
</html>
```

Both `data-theme="light"` and `data-theme="dark"` can be scoped to just part of a page.
The light defaults use a warm off-white surface with softened neutral borders, and the
dark defaults use a deep charcoal surface, warm light text, and quieter dark borders.
Surfaces get a crisp 2px radius, while form inputs and buttons go fully rounded.

Override any of these values after the component stylesheet:

```css
@import "@byearlybird/components/style.css";

:root {
  --eb-color-primary: #1d4ed8;
  --eb-color-primary-text: #fff;
  --eb-font-family: "Avenir Next", ui-sans-serif, system-ui, sans-serif;
  --eb-radius-surface: 12px;
  --eb-radius-input: 6px;
  --eb-radius-button: 9999px;
}
```

If Karla isn't installed or loaded, the token falls back to your app's system sans-serif
font. Hover and focus behavior stays consistent across the set, and those defaults use
`:where(:root)` too, so you can override them without specificity tricks.

## Charts

Charts ship from a separate entry, so apps that don't render charts never pull Recharts
into their bundle:

```tsx
import { BarChart, LineChart, PieChart } from "@byearlybird/components/charts";
```

These are fairly opinionated line, bar, and pie charts powered by Recharts. Each one is
responsive, handles light and dark themes, and picks up the existing component color
tokens by default. `@byearlybird/components/style.css` covers both entries, so there's no
separate chart stylesheet to import.

```tsx
const data = [
  { month: "Jan", current: 42, previous: 32 },
  { month: "Feb", current: 48, previous: 38 },
  { month: "Mar", current: 45, previous: 41 },
];

<LineChart
  data={data}
  title="Account growth"
  description="Monthly active accounts."
  xKey="month"
  series={[
    { dataKey: "current", label: "This year" },
    { dataKey: "previous", label: "Last year" },
  ]}
/>;

<BarChart
  data={data}
  title="Monthly accounts"
  xKey="month"
  series={[{ dataKey: "current", label: "Accounts" }]}
/>;

<PieChart
  data={[
    { plan: "Individual", share: 54 },
    { plan: "Team", share: 29 },
    { plan: "Enterprise", share: 17 },
  ]}
  title="Customer mix"
  nameKey="plan"
  valueKey="share"
  valueFormatter={(value) => `${value}%`}
/>;
```

Series get colored from `--eb-chart-series-1` through `--eb-chart-series-3`, and cycle if a
chart has more series than that. Each one meets the 3:1 non-text contrast minimum against
the default background in both themes, and the three sit in distinct lightness tiers so
they stay separable in grayscale and for red-green color vision deficiency.

Override them to match your own palette:

```css
:root {
  --eb-chart-series-1: #1d4ed8;
  --eb-chart-series-2: #0e7490;
  --eb-chart-series-3: #b45309;
}
```

If you do, try to keep each color at 3:1 or better against your chart background, and vary
lightness as well as hue. A palette that only differs by hue collapses for a meaningful
share of people.

Set a series `color`, or pass a `colors` array to `PieChart`, when a single chart needs to
break from the palette. Any CSS color value works, including your own theme variables.

## Contributing

Run Storybook to poke at every component and its props:

```bash
vp install
vp exec playwright install chromium
vp run storybook
```

Storybook runs at `http://localhost:6006`.

Validate and build:

```bash
vp check
vp test
vp run build
vp run build-storybook
```

`vp test` runs the SSR smoke test plus all the Storybook component tests in headless
Chromium. The package build lands in `dist/`, and the static Storybook site lands in
`storybook-static/`.

### Publishing

Authenticate with npm, pick a new version, then publish under the `beta` dist-tag so
prereleases never sneak into `latest`:

```bash
vp dlx bumpp
pnpm publish --tag beta
```

The package is set up for public scoped publishing. CI runs `vp check`, `vp test`, and the
workspace build on every push and pull request. Publishing stays manual for now.

## License

MIT
