import type { SyncPullPage, SyncTransport } from "./synchronizer.ts";

export type HttpSyncTransportOptions = Readonly<{
  /** Defaults to {@link globalThis.fetch}. */
  fetch?: typeof globalThis.fetch;
  /** Called before every request so the caller can refresh an expired token. */
  getToken(): null | string | Promise<null | string>;
  /** Root URL of the sync server, excluding `/v1/changes`. */
  serverUrl: string | URL;
}>;

export class HttpSyncResponseError extends Error {
  readonly retryAfter: string | null;
  readonly status: number;

  constructor(response: Response) {
    const statusText = response.statusText.length === 0 ? "" : ` ${response.statusText}`;
    super(`HTTP sync request failed with ${response.status}${statusText}.`);
    this.name = "HttpSyncResponseError";
    this.retryAfter = response.headers.get("Retry-After");
    this.status = response.status;
  }
}

export function createHttpSyncTransport(options: HttpSyncTransportOptions): SyncTransport {
  if (options === null || typeof options !== "object") {
    throw new TypeError("HTTP sync transport options must be an object.");
  }
  if (typeof options.getToken !== "function") {
    throw new TypeError("An HTTP sync transport requires a token provider.");
  }
  const fetchRequest = options.fetch ?? globalThis.fetch;
  if (typeof fetchRequest !== "function") {
    throw new TypeError("An HTTP sync transport requires a fetch implementation.");
  }
  const changesUrl = createChangesUrl(options.serverUrl);

  async function request(
    url: URL,
    init: Omit<RequestInit, "headers"> & Readonly<{ headers?: HeadersInit }>,
    expectedStatus: number,
  ): Promise<Response> {
    const token = await options.getToken();
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("HTTP synchronization requires an authentication token.");
    }
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetchRequest(url, {
      ...init,
      cache: "no-store",
      credentials: "omit",
      headers,
      redirect: "error",
    });
    if (response.status !== expectedStatus) throw new HttpSyncResponseError(response);
    return response;
  }

  return {
    pull: async ({ cursor, limit }) => {
      assertPullRequest(cursor, limit);
      const url = new URL(changesUrl);
      url.searchParams.set("limit", String(limit));
      if (cursor !== null) url.searchParams.set("cursor", cursor);
      const response = await request(
        url,
        { headers: { Accept: "application/json" }, method: "GET" },
        200,
      );
      return readPullPage(response);
    },
    push: async ({ changes }) => {
      if (!Array.isArray(changes)) {
        throw new TypeError("An HTTP synchronization push must contain a changes array.");
      }
      await request(
        new URL(changesUrl),
        {
          body: JSON.stringify({ changes }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        204,
      );
    },
  };
}

function createChangesUrl(serverUrl: string | URL): URL {
  const url = new URL(serverUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("An HTTP sync server URL must use HTTP or HTTPS.");
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new TypeError("An HTTP sync server URL cannot contain credentials.");
  }
  if (url.search.length > 0 || url.hash.length > 0) {
    throw new TypeError("An HTTP sync server URL cannot contain a query or fragment.");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/v1/changes`;
  return url;
}

function assertPullRequest(cursor: string | null, limit: number): void {
  if (cursor !== null && (typeof cursor !== "string" || cursor.length === 0)) {
    throw new TypeError("An HTTP synchronization cursor must be null or a nonempty string.");
  }
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RangeError("An HTTP synchronization limit must be a positive safe integer.");
  }
}

async function readPullPage(response: Response): Promise<SyncPullPage> {
  let value: unknown;
  try {
    value = await response.json();
  } catch (cause) {
    throw new TypeError("An HTTP synchronization pull response must contain valid JSON.", {
      cause,
    });
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("An HTTP synchronization pull response must be an object.");
  }
  const page = value as Partial<SyncPullPage>;
  if (!Array.isArray(page.changes)) {
    throw new TypeError("An HTTP synchronization pull response must contain a changes array.");
  }
  if (typeof page.cursor !== "string" || page.cursor.length === 0) {
    throw new TypeError("An HTTP synchronization pull cursor must be a nonempty string.");
  }
  if (typeof page.hasMore !== "boolean") {
    throw new TypeError("An HTTP synchronization pull hasMore value must be boolean.");
  }
  return { changes: page.changes, cursor: page.cursor, hasMore: page.hasMore };
}
