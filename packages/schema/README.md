# Schema by Early Bird

A seriously lightweight [Standard Schema](https://standardschema.dev) library.

This one gives you just the absolute basics needed to define strict, simple schemas for JSON-serializable data: strings, numbers, booleans, null, plain objects, and arrays.

That's the whole library, and it's small on purpose. If you're validating JSON at a boundary and want the smallest thing that does it strictly, I think this is a good fit. If you need unions, transforms, coercion, or anything else in [Limits](#limits), a fuller validator is probably the better call.

> [!NOTE]
> **Status: Beta.** The public API is mostly settled, but I'm not calling it done yet. Breaking
> changes are still possible before 1.0, and I'll call them out in the changelog rather than ship
> them quietly.

## Install

```sh
pnpm add @byearlybird/schema
```

## Example

```ts
import { array, boolean, number, object, string } from "@byearlybird/schema";

const taskSchema = object({
  id: string(),
  title: string({ minLength: 1, maxLength: 120 }),
  status: string({ values: ["do", "doing", "done"], default: "do" }),
  effort: number({ integer: true, min: 0, nullable: true, default: null }),
  done: boolean({ default: false }),
  tags: array(string(), { uniqueItems: true, default: [] }),
});

const result = taskSchema.validate({ id: "t1", title: "Write the docs" });

if (result.issues) {
  for (const issue of result.issues) {
    console.error(issue.path?.join("."), issue.message);
  }
} else {
  result.value;
  // { id: "t1", title: "Write the docs", status: "do",
  //   effort: null, done: false, tags: [] }
}
```

Validation hands back a result rather than throwing. On success the result has a `value`; on failure it has `issues`, and every issue carries a `message` plus the `path` to the value that failed:

```ts
taskSchema.validate({ id: "t1", title: "", tags: ["a", "a"] }).issues;
// [
//   { message: "Expected length at least 1.", path: ["title"] },
//   { message: "Expected unique items.", path: ["tags", 1] },
// ]
```

Each schema is a Standard Schema, so it also works anywhere that spec is accepted:

```ts
import { sValidator } from "@hono/standard-validator";

app.post("/tasks", sValidator("json", taskSchema), (c) => c.json(c.req.valid("json")));
```

## API

Every schema accepts two shared options:

- `nullable` — allow `null` in addition to the base value.
- `default` — value substituted when the input is `undefined`, which makes the input optional. Must be a value the schema accepts. A `null` default requires `nullable: true`.

### `string(options?)`

- `values` — restrict to a fixed set, narrowing the inferred type to a union.
- `minLength` / `maxLength` — bounds on string length.
- `pattern` — a `RegExp` the value must match.

### `number(options?)`

Accepts finite numbers only; `NaN` and `Infinity` are rejected.

- `values` — restrict to a fixed set, narrowing the inferred type to a union.
- `min` / `max` — bounds on the value.
- `integer` — require an integer.

### `boolean(options?)`

No options beyond `nullable` and `default`.

### `object(fields, options?)`

Accepts plain objects only — class instances, `Date`, `Map`, and arrays are rejected. **Unknown keys are rejected**, each reported as its own issue. Field names must be strings.

### `array(itemSchema, options?)`

- `uniqueItems` — reject duplicates. Items are compared by their validated JSON value, so key order does not affect the comparison.

### Type inference

`InferInput` is what a schema accepts, `InferOutput` is what it produces. They differ wherever a default is set: the key is optional on input and always present on output.

```ts
import type { InferInput, InferOutput } from "@byearlybird/schema";

type TaskInput = InferInput<typeof taskSchema>;
// { id: string; title: string; status?: "do" | "doing" | "done";
//   effort?: number | null; done?: boolean; tags?: string[] }

type Task = InferOutput<typeof taskSchema>;
// { id: string; title: string; status: "do" | "doing" | "done";
//   effort: number | null; done: boolean; tags: string[] }
```

### Invalid options throw

Options are checked when the schema is built, not when a value is validated, so a mistake shows up at startup instead of at some later request:

```ts
number({ min: 2, default: 1 }); // TypeError: Invalid default. Expected at least 2.
string({ pattern: "task" }); // TypeError: Invalid pattern.
```

Defaults get snapshotted at that point too. Mutating an object or array you passed as a `default` afterwards won't change what the schema produces, and a filled default is never shared between validations.

`undefined` is not a default, so just omit the option instead. This always throws at runtime, and if your project sets [`exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes) it's a compile error as well. That setting isn't required to use this package.

```ts
string({ default: undefined }); // TypeError: Invalid default. Expected a defined value.
```

### JSON values only

Every schema accepts only values that are already valid JSON, and every validated result is a JSON value tree. Non-JSON values are rejected rather than coerced:

- `NaN`, `Infinity`, `-Infinity`, and `BigInt` are not numbers here.
- `Date`, `Map`, `Set`, `RegExp`, functions, class instances, and boxed primitives such as `new String("a")` are not objects here.
- `undefined` is never a value. A field set to `undefined` counts as missing, which is an error unless that field has a `default`.
- Symbols are rejected as values and as keys.
- Array holes are rejected; non-index array properties are dropped.

Objects and arrays are rebuilt during validation, so the result is a fresh structure that can go straight to `JSON.stringify`: unknown input keys never survive, and a `__proto__` key stays an own property without reaching the prototype chain.

## Limits

This package is small on purpose. No unions, records, tuples, intersections, transforms, or coercion, and none of those are planned.

A few other things worth knowing:

- **ESM only.** There's no CommonJS build, so `require()` won't work.
- **Synchronous.** `validate` never returns a promise.
- **Composition only takes Early Bird schemas.** `object()` and `array()` want schemas from this package, not arbitrary Standard Schema implementations.
- **Objects are strict.** Unknown keys are an error, and there's no passthrough or strip mode.
- **No optional-without-default.** Every key in the output type is present. To model an absent value, use `nullable: true, default: null` and read it as `null`.

## License

MIT
