/**
 * Decorative glyphs shared by more than one component. Each is `aria-hidden`:
 * they repeat information already conveyed by the control they sit inside.
 *
 * Icons used by a single component stay in that component's file.
 */

/** The checkmark shared by Combobox, Menu, and Select indicators. */
export function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      <path d="m3 8 3 3 7-7" />
    </svg>
  );
}

/** The downward caret shared by Combobox and Select triggers. */
export function CaretIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}
