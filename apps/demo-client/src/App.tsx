import { Button, Checkbox, Input } from "@byearlybird/components";
import { useState } from "react";
import type { FormEvent } from "react";
import { useDatabase, useSuspenseQuery } from "./database";
import type { Todo } from "./database";

export function App() {
  const database = useDatabase();
  const [title, setTitle] = useState("");
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
