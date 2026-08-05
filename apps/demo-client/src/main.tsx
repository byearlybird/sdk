import { Button, Checkbox, Input } from "@byearlybird/components";
import { createDatabase } from "@byearlybird/db";
import { createDatabaseReact } from "@byearlybird/db-react";
import { opfsStorageAdapter } from "@byearlybird/db/opfs";
import { boolean, object, string } from "@byearlybird/schema";
import type { InferOutput } from "@byearlybird/schema";
import { StrictMode, Suspense, useState } from "react";
import type { FormEvent } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const todoSchema = object({
  completed: boolean(),
  createdAt: string(),
  title: string({ maxLength: 120, minLength: 1 }),
});

type Todo = InferOutput<typeof todoSchema>;
type TodoDatabase = { todos: Todo };

const { DatabaseProvider, useDatabase, useSuspenseQuery } = createDatabaseReact<TodoDatabase>();

const database = createDatabase<TodoDatabase>({
  name: "early-bird-todos",
  storage: opfsStorageAdapter,
});

function App() {
  const database = useDatabase();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);
  const todos = useSuspenseQuery((readonlyDatabase) =>
    readonlyDatabase.query("todos", (query) => ({ orderBy: [query.asc("createdAt")] })),
  );
  const remaining = todos.filter(({ data }) => !data.completed).length;

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = todoSchema.validate({
      completed: false,
      createdAt: new Date().toISOString(),
      title: title.trim(),
    });

    if (result.issues) {
      setError(result.issues[0]?.message ?? "Enter a to-do.");
      return;
    }

    setIsAdding(true);
    setError(undefined);
    try {
      await database.insert("todos", crypto.randomUUID(), result.value);
      setTitle("");
    } catch (cause) {
      setError(toErrorMessage(cause));
    } finally {
      setIsAdding(false);
    }
  }

  function runMutation(mutation: Promise<unknown>) {
    setError(undefined);
    void mutation.catch((cause: unknown) => setError(toErrorMessage(cause)));
  }

  return (
    <main className="todo-app">
      <header>
        <p className="eyebrow">Early Bird</p>
        <h1>To-do</h1>
      </header>

      <form className="add-todo" onSubmit={(event) => void addTodo(event)}>
        <Input
          aria-label="New to-do"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          value={title}
        />
        <Button disabled={isAdding} type="submit">
          Add
        </Button>
      </form>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {todos.length === 0 ? (
        <p className="empty">Nothing to do yet.</p>
      ) : (
        <ul className="todo-list">
          {todos.map(({ data: todo, id }) => (
            <li key={id}>
              <label className="todo-label">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={(checked) =>
                    runMutation(database.patch("todos", id, { completed: checked }))
                  }
                />
                <span className={todo.completed ? "completed" : undefined}>{todo.title}</span>
              </label>
              <Button
                aria-label={`Delete ${todo.title}`}
                onClick={() => runMutation(database.delete("todos", id))}
                size="icon"
                type="button"
                variant="secondary"
              >
                <span aria-hidden="true">×</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <footer>
        {remaining} {remaining === 1 ? "item" : "items"} left
      </footer>
    </main>
  );
}

function toErrorMessage(value: unknown): string {
  return value instanceof Error ? value.message : "Something went wrong.";
}

const root = document.querySelector<HTMLDivElement>("#root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <DatabaseProvider database={database}>
      <Suspense fallback={<p className="loading">Opening your list…</p>}>
        <App />
      </Suspense>
    </DatabaseProvider>
  </StrictMode>,
);
