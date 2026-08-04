# @byearlybird/components

Reusable React components by Early Bird, built with TypeScript and CSS Modules.

> [!WARNING]
> **Status: Alpha.** The component library is under active development. Component APIs, styling,
> and design tokens may change before 1.0.

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
  BarChart,
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
  LineChart,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  PieChart,
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
components should import only the component stylesheet. The standalone token entry
contains the public theme values and the Pollen primitives used by the library.

```css
:root {
  --components-color-primary: #252523;
  --components-color-primary-text: #faf9f6;
  --components-color-background: #faf9f6;
  --components-color-text: #252523;
  --components-color-text-muted: color-mix(in srgb, var(--components-color-text) 65%, transparent);
  --components-color-border: #b8b5ad;
  --components-color-muted: #e3e1da;
  --components-font-family: "Karla Variable", "Karla", ui-sans-serif, system-ui, sans-serif;
  --components-radius-surface: 2px;
  --components-radius-input: 9999px;
  --components-radius-button: 9999px;
  --components-motion-duration: 200ms;
  --components-motion-easing-standard: ease;
  --components-motion-easing-out: ease-out;
}
```

Use `--components-color-text-muted` for secondary content such as timestamps,
metadata, and supporting icons. It derives a translucent color from the active
text color, so it follows both light and dark themes while preserving the color
of the surface beneath it. Use `--components-color-muted` for muted surfaces instead.

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
  --components-color-primary: #1d4ed8;
  --components-color-primary-text: #fff;
  --components-font-family: "Avenir Next", ui-sans-serif, system-ui, sans-serif;
  --components-radius-surface: 12px;
  --components-radius-input: 6px;
  --components-radius-button: 9999px;
}
```

If Karla is not installed or loaded, the token falls back to the application's
system sans-serif font. The library supplies consistent hover and focus behavior. Its
defaults use `:where(:root)`, so applications can override them without specificity
tricks.

## Charts

The library includes opinionated line, bar, and pie charts powered by Recharts. Each chart
is responsive, supports light and dark themes, and uses the existing component color
tokens by default.

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

Set a series `color` or pass a `colors` array to `PieChart` when a product-specific
palette is needed. CSS color values, including application theme variables, are
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

Authenticate with npm, choose a new version, then publish:

```bash
vp dlx bumpp
pnpm publish
```

The package is configured for public scoped publishing.
