import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { database, DatabaseProvider } from "./database";
import "./style.css";

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
