import { createDatabase } from "@byearlybird/db";
import { createDatabaseReact } from "@byearlybird/db-react";
import { opfsStorageAdapter } from "@byearlybird/db/opfs";
import { boolean, object, string } from "@byearlybird/schema";
import type { InferOutput } from "@byearlybird/schema";

const todoSchema = object({
  completed: boolean(),
  createdAt: string(),
  title: string({ maxLength: 120, minLength: 1 }),
});

export type Todo = InferOutput<typeof todoSchema>;

type TodoDatabase = { todos: Todo };

export const { DatabaseProvider, useDatabase, useSuspenseQuery } =
  createDatabaseReact<TodoDatabase>();

export const database = createDatabase<TodoDatabase>({
  name: "early-bird-todos",
  storage: opfsStorageAdapter,
});
