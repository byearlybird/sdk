## React 19

- This package targets React 19. In function components, accept `ref` as a typed prop
  and pass it to the underlying element or primitive. Do not introduce
  `React.forwardRef` or `forwardRef`.
- Only use `forwardRef` when an explicit compatibility requirement for React 18 or
  older makes it necessary, and document that exception next to the component.

## Design tokens

- Component CSS must reference the existing Pollen primitives and `--components-*`
  theme tokens in `src/styles/tokens.css` for design decisions such as color,
  typography, spacing, sizing, and radius. Do not hardcode an equivalent value when
  a suitable token already exists.
- Reuse an existing token before adding one. Add a new token only when no existing
  token expresses the design decision, and do not expand the package's public theme
  API without explicit approval.
