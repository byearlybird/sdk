# @byearlybird/components

Reusable React components by Early Bird, built with TypeScript and CSS Modules.

> [!NOTE]
> **Status: Beta.** The public API is stabilizing. Breaking changes are still possible before 1.0,
> but they will be called out in the changelog rather than shipped silently.

## Requirements

- **React** 19.2 or later (React 19 only).
- **ESM only.** The package ships no CommonJS build.
- **Browsers:** the current and previous release of Chrome, Edge, Firefox, and Safari. The styles
  rely on `color-mix()` and CSS custom properties, so browsers without them are unsupported.
- **Accessibility target:** WCAG 2.2 Level AA. Interactive controls meet the 3:1 non-text contrast
  and 24×24px target-size minimums, and chart series meet 3:1 in distinct lightness tiers. Charts
  still separate series by color and legend rather than by shape or dash pattern, so keep the
  legend visible and do not rely on color as the sole cue in your own labeling.

## Install

```bash
pnpm add @byearlybird/components
```

`@byearlybird/components` supports React 19.2 and later React 19 releases. If the consuming app does not
already have React installed, add it too:

```bash
pnpm add react react-dom
```

Karla is the component library's preferred font. Font files are not bundled with the component
library, so install them in the consuming application:

```bash
pnpm add @fontsource-variable/karla
```

## Use

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

Import `@byearlybird/components/style.css` once in the consuming app's root entry or
layout. The component source uses CSS Modules, and the package exposes the compiled,
scoped stylesheet as this stable CSS entry.

`Button`, `Input`, and the Select and Combobox parts extend their
corresponding Base UI primitives, including state-aware `className`, Field
integration, and ref support. Wrap `Input` in `InputGroup` when icons or other
adornments need to sit beside it. `SelectLeadingIcon` and
`ComboboxLeadingIcon` provide the same leading-icon composition for selection
controls. `Textarea` extends the native textarea props.

`CardTitle` renders an `h2` by default. Set `as` to the heading level that fits the
surrounding document outline so cards do not break the page's heading order:

```tsx
<Card>
  <CardHeader>
    <CardTitle as="h3">Recent activity</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

## Overlays

Dialog and Drawer include themed backdrops, surfaces, titles, descriptions, triggers,
and close controls. Their `Content` components supply the standard portal, backdrop,
viewport, and popup structure. Drawer additionally supports Base UI's swipe
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

The package exposes its tokens separately from its component styles. Apps that only need
the shared tokens can import the standalone entry:

```css
@import "@byearlybird/components/tokens.css";
```

`@byearlybird/components/style.css` already includes these tokens, so apps using the
components should import only the component stylesheet.

Every custom property the library defines is prefixed `--eb-` and every one of them is
supported public API. Read them, compose them in `calc()`, or override them — they are
meant to be built on, not just themed. Because the library declares them at
`:where(:root)`, an application's own `:root` rule always wins without specificity tricks.

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
changing what it means, is a breaking change and will appear in the changelog. Adjusting a
token's _value_ — a shade, a duration — is a minor release, so pin the value yourself if
your design depends on an exact number. The set is enforced by `tests/tokens.test.ts`,
which fails the build if a token is dropped, renamed, or added without being documented
here.

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

Use `--eb-color-danger` for error and destructive states; it is the border color the
Input and Textarea error styles already use. `--eb-color-scrim` is the base color for
modal backdrops and is intentionally black in both themes — compose it with `color-mix()`
rather than overriding it to a theme color.

Use `--eb-color-text-muted` for secondary content such as timestamps,
metadata, and supporting icons. It derives a translucent color from the active
text color, so it follows both light and dark themes while preserving the color
of the surface beneath it. Use `--eb-color-muted` for muted surfaces instead.

> [!IMPORTANT]
> Because `--eb-color-text-muted` is translucent, its contrast depends on whatever sits
> behind it. Against the default background it measures 4.77:1 in light mode and 5.89:1
> in dark mode. If you override `--eb-color-text` or `--eb-color-background`, or place
> muted text on a `--eb-color-muted` surface, re-check it against the 4.5:1 minimum.

The standard motion duration is the default for control feedback, visual-state
changes, and larger surface or shape transitions. Pair it with the standard easing
for general state changes, or use the out easing when movement or expansion should
settle into place.

The components follow the system color-scheme preference by default. Set `data-theme` on
the document root or any containing element to select a mode explicitly:

```html
<html data-theme="dark">
  <!-- Components use the dark theme -->
</html>
```

Both `data-theme="light"` and `data-theme="dark"` can be scoped to part of a page.
The light defaults use a warm off-white surface with softened neutral borders. The
dark defaults use a deep charcoal surface, warm light text, and quieter dark
borders. Surfaces use a crisp 2px radius, while form inputs and buttons use fully
rounded shapes.

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

If Karla is not installed or loaded, the token falls back to the application's
system sans-serif font. The library supplies consistent hover and focus behavior. Its
defaults use `:where(:root)`, so applications can override them without specificity
tricks.

## Charts

Charts ship from a separate entry so applications that do not render charts never pull
Recharts into their bundle:

```tsx
import { BarChart, LineChart, PieChart } from "@byearlybird/components/charts";
```

The library includes opinionated line, bar, and pie charts powered by Recharts. Each chart
is responsive, supports light and dark themes, and uses the existing component color
tokens by default. `@byearlybird/components/style.css` covers both entries, so there is no
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

Series are colored from `--eb-chart-series-1` through `--eb-chart-series-3`, cycling if a
chart has more series than that. Each one meets the 3:1 non-text contrast minimum against
the default background in both themes, and the three sit in distinct lightness tiers so
they stay separable in grayscale and for red-green color vision deficiency.

Override them to match a product palette:

```css
:root {
  --eb-chart-series-1: #1d4ed8;
  --eb-chart-series-2: #0e7490;
  --eb-chart-series-3: #b45309;
}
```

If you do, keep each color at 3:1 or better against your chart background and vary
lightness as well as hue — a palette that differs only by hue collapses for a
meaningful share of users.

Set a series `color` or pass a `colors` array to `PieChart` when a single chart needs to
depart from the palette. CSS color values, including application theme variables, are
supported.

## Develop

```bash
vp install
vp exec playwright install chromium
vp run storybook
```

Storybook runs at `http://localhost:6006`.

## Validate and build

```bash
vp check
vp test
vp run build
vp run build-storybook
```

`vp test` runs the SSR smoke test and all Storybook component tests in headless Chromium.
The package build is written to `dist/`, and the static Storybook site is written to
`storybook-static/`.

## Publish

Authenticate with npm, choose a new version, then publish under the `beta` dist-tag so
prereleases never become `latest`:

```bash
vp dlx bumpp
pnpm publish --tag beta
```

The package is configured for public scoped publishing. CI runs `vp check`, `vp test`,
and the workspace build on every push and pull request; publishing stays manual.
