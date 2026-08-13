## How to build with Early Bird components

### There is no provider — do not look for one

This is a **pure CSS + custom-property** design system. There is no `ThemeProvider`, no context, no
setup call. Components are styled entirely by `styles.css`, which must be linked once; link it and
components are correctly styled anywhere in the tree. Do not wrap the app in anything.

Theme is an **HTML attribute**, not a React prop. The full light palette is declared on bare
`:where(:root)`, so light works with no attribute at all. For dark, set `data-theme` on an ancestor:

```html
<html data-theme="dark">
  <!-- or data-theme="light"; omit entirely for light -->
</html>
```

### Styling idiom: tokens, not utility classes

**This system has no utility-class vocabulary.** There is no `bg-*`, no `p-4`, no `gap-md` — inventing
class names produces unstyled output. Style the components' own surfaces via their props, and write your
layout glue with plain CSS referencing the `--eb-*` custom properties.

Every component accepts `className` and `style`. Both also accept a **function of component state**
(`className={(state) => …}`), and `render` swaps the underlying element — these come from Base UI
underneath, so state-driven styling and polymorphism work throughout.

The complete token vocabulary (39, verbatim):

| Family     | Tokens                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| color      | `--eb-color-primary`, `--eb-color-primary-text`, `--eb-color-background`, `--eb-color-text`, `--eb-color-text-muted`, `--eb-color-border`, `--eb-color-muted`, `--eb-color-danger`, `--eb-color-accent`, `--eb-color-scrim` |
| chart      | `--eb-chart-series-1`, `--eb-chart-series-2`, `--eb-chart-series-3`                                                                                                                                                         |
| spacing    | `--eb-size-1` … `--eb-size-10` (4px → 40px, in 4px steps)                                                                                                                                                                   |
| typography | `--eb-font-family`, `--eb-font-size-body`, `--eb-font-size-title`, `--eb-font-weight-regular`, `--eb-font-weight-semibold`, `--eb-line-height-none`, `--eb-line-height-normal`                                              |
| radius     | `--eb-radius-surface`, `--eb-radius-input`, `--eb-radius-button`                                                                                                                                                            |
| shadow     | `--eb-shadow-raised-content`, `--eb-shadow-elevated-content`                                                                                                                                                                |
| border     | `--eb-border-width`                                                                                                                                                                                                         |
| motion     | `--eb-motion-duration`, `--eb-motion-easing-standard`, `--eb-motion-easing-out`                                                                                                                                             |

Use tokens for **every** color, space, radius and type decision — hardcoded hex values and pixel
paddings will look off-brand and will not follow the theme into dark mode.

### Compound components

`Card`, `Dialog`, `Drawer`, `Menu`, `Select`, `Combobox`, `Input`, `Radio`, `SegmentedControl` and
`TabBar` are **compositions**, not single elements — e.g. `Card` +
`CardImage`/`CardHeader`/`CardTitle`/`CardContent`;
`Dialog` + `DialogTrigger`/`DialogContent`/`DialogTitle`/`DialogDescription`/`DialogClose`;
`Input` + `InputGroup`/`InputIcon`/`InputAction`;
`SegmentedControl` + `SegmentedControlItem`; `TabBar` + `TabBarItem`.
Read the component's `.prompt.md` before composing.

`SegmentedControl` selects by `value`/`defaultValue`, which are **arrays** (it wraps a toggle group):
`<SegmentedControl defaultValue={["all"]}>`. `TabBar` takes its floating action button through the
`action` slot — pass a real `Button`, don't rebuild one:
`<TabBar action={<Button size="icon" variant="primary" aria-label="New"><ButtonIcon><PlusIcon/></ButtonIcon></Button>}>`.
`ToggleButton` is a circular icon toggle with `tone="neutral"|"primary"|"accent"`; it needs an
`aria-label`, since the icon is its only content.

**Overlays are closed by default.** `Dialog`, `Drawer`, `Menu`, `Select` and `Combobox` render only
their trigger until opened. To show one open in a static design, pass `defaultOpen` to the root — the
preview cards show the closed trigger precisely because they render the default state.

### Where the truth lives

Read these before styling — they are the authority, and they are in this project:

- `styles.css` and its `@import` closure (`_ds_bundle.css`, `fonts/fonts.css`) — every real class and
  token definition.
- `components/<group>/<Name>/<Name>.prompt.md` — usage and variants for one component.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract.

### A typical build

```jsx
const { Card, CardHeader, CardTitle, CardContent, Button } = window.EarlyBirdComponents;

<div
  style={{
    display: "grid",
    gap: "var(--eb-size-4)",
    padding: "var(--eb-size-6)",
    background: "var(--eb-color-background)",
    fontFamily: "var(--eb-font-family)",
  }}
>
  <Card>
    <CardHeader>
      <CardTitle>Account growth</CardTitle>
    </CardHeader>
    <CardContent>Monthly active accounts over the last six months.</CardContent>
  </Card>
  <Button variant="primary">Save changes</Button>
</div>;
```

Library components carry the design language; your own layout glue uses the tokens. That is the whole
idiom.
