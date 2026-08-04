import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { Checkbox, Input, InputGroup, InputIcon } from "../src/index.ts";

test("controls include their standard anatomy", () => {
  const markup = renderToStaticMarkup(<Checkbox defaultChecked />);

  expect(markup).toContain("<svg");
});

test("Input is a control and InputGroup composes adornments", () => {
  const inputMarkup = renderToStaticMarkup(<Input aria-label="Name" />);
  const groupMarkup = renderToStaticMarkup(
    <InputGroup>
      <InputIcon>Search</InputIcon>
      <Input aria-label="Search" />
    </InputGroup>,
  );

  expect(inputMarkup).toMatch(/^<input/);
  expect(groupMarkup).toContain('data-slot="input-group"');
  expect(groupMarkup).toContain('aria-label="Search"');
});
