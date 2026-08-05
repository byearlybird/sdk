import { describe, expect, expectTypeOf, it } from "vite-plus/test";
import { createHttpSyncTransport, HttpSyncResponseError } from "../src/http.ts";
import type { HttpSyncTransportOptions } from "../src/http.ts";
import type { SyncChange } from "../src/sync.ts";
import type { SyncTransport } from "../src/synchronizer.ts";

type FetchCall = Readonly<{
  init: RequestInit | undefined;
  url: string;
}>;

function createFetchMock(responses: readonly Response[]): Readonly<{
  calls: FetchCall[];
  fetch: typeof globalThis.fetch;
}> {
  const calls: FetchCall[] = [];
  let responseIndex = 0;
  return {
    calls,
    fetch: async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      calls.push({ init, url });
      const response = responses[responseIndex];
      if (response === undefined) throw new Error("The fetch mock has no response.");
      responseIndex += 1;
      return response;
    },
  };
}

function createChange(): SyncChange {
  return {
    changeId: "change-1",
    collection: "tasks",
    deleted: false,
    entity: { title: "First" },
    entityId: "task-1",
    format: 1,
    version: { counter: 1, replicaId: "replica-1" },
  };
}

describe("createHttpSyncTransport", () => {
  it("pulls an encoded cursor with a fresh bearer token and secure fetch options", async () => {
    const fetchMock = createFetchMock([
      Response.json({ changes: [createChange()], cursor: "next", hasMore: false }),
    ]);
    const requestedTokens: number[] = [];
    const transport = createHttpSyncTransport({
      fetch: fetchMock.fetch,
      getToken: () => {
        requestedTokens.push(requestedTokens.length + 1);
        return "pull-token";
      },
      serverUrl: "https://sync.example.com/root/",
    });

    expectTypeOf(transport).toEqualTypeOf<SyncTransport>();
    await expect(transport.pull({ cursor: "page / one?", limit: 25 })).resolves.toMatchObject({
      cursor: "next",
      hasMore: false,
    });

    expect(requestedTokens).toEqual([1]);
    expect(fetchMock.calls).toHaveLength(1);
    const call = fetchMock.calls[0];
    expect(call?.url).toBe(
      "https://sync.example.com/root/v1/changes?limit=25&cursor=page+%2F+one%3F",
    );
    expect(call?.init).toMatchObject({
      cache: "no-store",
      credentials: "omit",
      method: "GET",
      redirect: "error",
    });
    const headers = new Headers(call?.init?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer pull-token");
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("pushes the complete batch and reacquires the token for each request", async () => {
    const fetchMock = createFetchMock([
      new Response(null, { status: 204 }),
      new Response(null, { status: 204 }),
    ]);
    let token = 0;
    const transport = createHttpSyncTransport({
      fetch: fetchMock.fetch,
      getToken: async () => `token-${++token}`,
      serverUrl: new URL("https://sync.example.com"),
    });
    const change = createChange();

    await transport.push({ changes: [change] });
    await transport.push({ changes: [change] });

    expect(fetchMock.calls).toHaveLength(2);
    for (const [index, call] of fetchMock.calls.entries()) {
      expect(call.url).toBe("https://sync.example.com/v1/changes");
      expect(call.init).toMatchObject({ method: "POST" });
      expect(call.init?.body).toBe(JSON.stringify({ changes: [change] }));
      const headers = new Headers(call.init?.headers);
      expect(headers.get("Authorization")).toBe(`Bearer token-${index + 1}`);
      expect(headers.get("Content-Type")).toBe("application/json");
    }
  });

  it("throws a structured error for an unexpected HTTP status", async () => {
    const fetchMock = createFetchMock([
      new Response(null, {
        headers: { "Retry-After": "30" },
        status: 503,
        statusText: "Service Unavailable",
      }),
    ]);
    const transport = createHttpSyncTransport({
      fetch: fetchMock.fetch,
      getToken: () => "token",
      serverUrl: "https://sync.example.com",
    });

    const error = await transport
      .pull({ cursor: null, limit: 100 })
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(HttpSyncResponseError);
    expect(error).toMatchObject({ retryAfter: "30", status: 503 });
  });

  it("does not issue a request without an authentication token", async () => {
    const fetchMock = createFetchMock([]);
    const options: HttpSyncTransportOptions = {
      fetch: fetchMock.fetch,
      getToken: () => null,
      serverUrl: "https://sync.example.com",
    };

    await expect(
      createHttpSyncTransport(options).pull({ cursor: null, limit: 100 }),
    ).rejects.toThrow("requires an authentication token");
    expect(fetchMock.calls).toEqual([]);
  });

  it("rejects malformed successful pull responses", async () => {
    const fetchMock = createFetchMock([Response.json({ changes: [], hasMore: false })]);
    const transport = createHttpSyncTransport({
      fetch: fetchMock.fetch,
      getToken: () => "token",
      serverUrl: "https://sync.example.com",
    });

    await expect(transport.pull({ cursor: null, limit: 100 })).rejects.toThrow(
      "cursor must be a nonempty string",
    );
  });

  it("validates server URLs and pull requests before fetching", async () => {
    const baseOptions = {
      fetch: createFetchMock([]).fetch,
      getToken: () => "token",
    };

    expect(() =>
      createHttpSyncTransport({ ...baseOptions, serverUrl: "ftp://sync.example.com" }),
    ).toThrow("must use HTTP or HTTPS");
    expect(() =>
      createHttpSyncTransport({ ...baseOptions, serverUrl: "https://user@sync.example.com" }),
    ).toThrow("cannot contain credentials");
    expect(() =>
      createHttpSyncTransport({ ...baseOptions, serverUrl: "https://sync.example.com?bucket=1" }),
    ).toThrow("cannot contain a query or fragment");

    const transport = createHttpSyncTransport({
      ...baseOptions,
      serverUrl: "https://sync.example.com",
    });
    await expect(transport.pull({ cursor: "", limit: 100 })).rejects.toThrow("nonempty string");
    await expect(transport.pull({ cursor: null, limit: 0 })).rejects.toThrow(
      "positive safe integer",
    );
  });
});
