import { Button, Checkbox, Input } from "@byearlybird/components";
import { useState } from "react";
import type { FormEvent } from "react";
import { useDatabase, useSuspenseQuery } from "./database";
import type { Todo } from "./database";
import { demoEncryption, saveSetupKey } from "./encryption";

export function App() {
  const database = useDatabase();
  const [title, setTitle] = useState("");
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const todos = useSuspenseQuery((readonlyDatabase) =>
    readonlyDatabase.query("todos", (query) => ({ orderBy: [query.asc("createdAt")] })),
  );
  const remaining = todos.filter(({ data }) => !data.completed).length;
  const completed = todos.length - remaining;

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const todo: Todo = {
      completed: false,
      createdAt: new Date().toISOString(),
      title: title.trim(),
    };

    if (todo.title.length === 0) return;

    await database.insert("todos", crypto.randomUUID(), todo);
    setTitle("");
  }

  function setTodoCompleted(id: string, completed: boolean) {
    void database.patch("todos", id, { completed });
  }

  function deleteTodo(id: string) {
    void database.delete("todos", id);
  }

  function clearCompleted() {
    const completedTodoIds = todos.filter(({ data }) => data.completed).map(({ id }) => id);

    void database.batch((mutation) => {
      for (const id of completedTodoIds) {
        mutation.delete("todos", id);
      }
    });
  }

  async function copySetupKey() {
    try {
      await navigator.clipboard.writeText(demoEncryption.setupKey);
      setKeyMessage("Setup key copied.");
    } catch {
      setKeyMessage("The browser could not copy the setup key. Select and copy it manually.");
    }
  }

  function importSetupKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const setupKey = new FormData(event.currentTarget).get("setupKey");
      if (typeof setupKey !== "string") throw new TypeError("Enter a setup key.");
      saveSetupKey(setupKey);
      window.location.reload();
    } catch (error) {
      setKeyMessage(
        error instanceof Error ? error.message : "The setup key could not be imported.",
      );
    }
  }

  return (
    <main className="todo-app">
      <header>
        <p className="eyebrow">Early Bird</p>
        <h1>To-do</h1>
      </header>

      <section className="encryption-panel" aria-labelledby="encryption-title">
        <div className="encryption-heading">
          <div>
            <p className="eyebrow">Demo security</p>
            <h2 id="encryption-title">End-to-end encrypted</h2>
          </div>
          <span className="encrypted-badge">AES-256-GCM</span>
        </div>
        <p>
          To-do contents are encrypted in this browser before syncing. The relay can still see
          record IDs, versions, and collection names.
        </p>
        <label className="setup-key-label" htmlFor="setup-key">
          Setup key for another browser
        </label>
        <div className="setup-key-row">
          <textarea id="setup-key" readOnly rows={3} value={demoEncryption.setupKey} />
          <Button onClick={() => void copySetupKey()} type="button" variant="secondary">
            Copy
          </Button>
        </div>
        <form className="import-key" onSubmit={importSetupKey}>
          <Input
            aria-label="Setup key from another browser"
            name="setupKey"
            placeholder="Paste a setup key from another browser"
            required
          />
          <Button type="submit" variant="secondary">
            Use key
          </Button>
        </form>
        <p className="demo-warning">
          Demo only: the key is visible here and stored in localStorage. There is no login, access
          control, key rotation, or recovery.
        </p>
        {keyMessage === null ? null : (
          <p className="key-message" role="status">
            {keyMessage}
          </p>
        )}
      </section>

      <form className="add-todo" onSubmit={(event) => void addTodo(event)}>
        <Input
          aria-label="New to-do"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          required
          value={title}
        />
        <Button type="submit">Add</Button>
      </form>

      {todos.length === 0 ? (
        <p className="empty">Nothing to do yet.</p>
      ) : (
        <ul className="todo-list">
          {todos.map(({ data: todo, id }) => (
            <li key={id}>
              <label className="todo-label">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={(checked) => setTodoCompleted(id, checked)}
                />
                <span className={todo.completed ? "completed" : undefined}>{todo.title}</span>
              </label>
              <Button
                aria-label={`Delete ${todo.title}`}
                onClick={() => deleteTodo(id)}
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

      <footer className="todo-footer">
        <span>
          {remaining} {remaining === 1 ? "item" : "items"} left
        </span>
        {completed > 0 ? (
          <Button onClick={clearCompleted} type="button" variant="secondary">
            Clear completed
          </Button>
        ) : null}
      </footer>
    </main>
  );
}
