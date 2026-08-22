/**
 @fileoverview
 Covers what the guard admits and what it refuses. Each check is the only thing
 between a page you happened to visit and a local server.
*/

import { assertEquals } from "@std/assert";

import { createRequestGuard, isFetchSiteAllowed } from "./requestGuard.ts";

//
//@main

//## isFetchSiteAllowed

/** A request as a page on another site would have the browser send it. */
const crossSiteRequest = (headers: Record<string, string>) =>
  new Request("http://127.0.0.1/index.html", {
    headers: { "sec-fetch-site": "cross-site", ...headers },
  });

Deno.test("isFetchSiteAllowed: a client that sends no Sec-Fetch-Site is allowed", () => {
  assertEquals(
    isFetchSiteAllowed(new Request("http://127.0.0.1/index.html")),
    true,
  );
});

Deno.test("isFetchSiteAllowed: the page's own subresources are allowed", () => {
  for (const site of ["same-origin", "same-site", "none"]) {
    assertEquals(
      isFetchSiteAllowed(
        new Request("http://127.0.0.1/index.html", {
          headers: { "sec-fetch-site": site },
        }),
      ),
      true,
      site,
    );
  }
});

Deno.test("isFetchSiteAllowed: a cross-site fetch is refused", () => {
  assertEquals(
    isFetchSiteAllowed(crossSiteRequest({ "sec-fetch-mode": "cors" })),
    false,
  );
});

Deno.test("isFetchSiteAllowed: a cross-site <script src> embed is refused, though it sends no Origin", () => {
  assertEquals(
    isFetchSiteAllowed(crossSiteRequest({
      "sec-fetch-mode": "no-cors",
      "sec-fetch-dest": "script",
    })),
    false,
  );
});

Deno.test("isFetchSiteAllowed: a cross-site navigation is refused wherever it lands", () => {
  for (
    const destination of ["document", "iframe", "frame", "object", "embed"]
  ) {
    assertEquals(
      isFetchSiteAllowed(crossSiteRequest({
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": destination,
      })),
      false,
      destination,
    );
  }
});

//
//## createRequestGuard

const _PORT = 3080;

/** A request addressed to this server, as the page it served would send it. */
function ownRequest(
  path: string,
  headers: Record<string, string> = {},
  init: RequestInit = {},
): Request {
  return new Request(`http://127.0.0.1:${_PORT}${path}`, {
    ...init,
    headers: {
      host: `127.0.0.1:${_PORT}`,
      "sec-fetch-site": "same-origin",
      ...headers,
    },
  });
}

const guard = createRequestGuard({ port: _PORT });

Deno.test("createRequestGuard: admits the page the server itself sent", () => {
  assertEquals(guard(ownRequest("/index.html")), null);
});

Deno.test("createRequestGuard: admits every loopback name for the bound port", () => {
  for (const hostname of ["127.0.0.1", "localhost", "[::1]"]) {
    assertEquals(
      guard(ownRequest("/index.html", { host: `${hostname}:${_PORT}` })),
      null,
      hostname,
    );
  }
});

Deno.test("createRequestGuard: refuses a Host on a port this server isn't bound to", () => {
  assertEquals(
    guard(ownRequest("/index.html", { host: `127.0.0.1:${_PORT + 1}` }))
      ?.status,
    403,
  );
});

Deno.test("createRequestGuard: refuses the rebinding Host, which every same-origin check would pass", () => {
  const refusal = guard(
    ownRequest("/index.html", { host: `attacker.com:${_PORT}` }),
  );
  // - the page loaded from attacker.com, so the browser calls us its own
  //   origin and sends Sec-Fetch-Site: same-origin along with it

  assertEquals(refusal?.status, 403);
});

Deno.test("createRequestGuard: refuses a cross-site request that is addressed correctly", () => {
  assertEquals(
    guard(ownRequest("/index.html", { "sec-fetch-site": "cross-site" }))
      ?.status,
    403,
  );
});

Deno.test("createRequestGuard: refuses a mutation carrying a foreign Origin", () => {
  assertEquals(
    guard(ownRequest("/api/ingest", { origin: "http://attacker.com" }, {
      method: "POST",
    }))?.status,
    403,
  );
});

Deno.test("createRequestGuard: admits a mutation sending no Origin, so scripts still work", () => {
  assertEquals(
    guard(ownRequest("/api/ingest", {}, { method: "POST" })),
    null,
  );
});

Deno.test("createRequestGuard: ignores a foreign Origin on a read, which can't act on its own", () => {
  assertEquals(
    guard(ownRequest("/api/window", { origin: "http://x.com" })),
    null,
  );
});

//### The client header

const headerGuard = createRequestGuard({
  port: _PORT,
  clientHeader: "x-worldview",
});

Deno.test("createRequestGuard: refuses an api request missing the client header", () => {
  assertEquals(headerGuard(ownRequest("/api/window"))?.status, 403);
});

Deno.test("createRequestGuard: admits an api request carrying it, whatever its value", () => {
  assertEquals(
    headerGuard(ownRequest("/api/window", { "x-worldview": "" })),
    null,
  );
});

Deno.test("createRequestGuard: leaves page loads alone, since a navigation sets no headers", () => {
  assertEquals(headerGuard(ownRequest("/index.html")), null);
});

Deno.test("createRequestGuard: requires the header only where isPathGuarded says", () => {
  const streamGuard = createRequestGuard({
    port: _PORT,
    clientHeader: "x-worldview",
    isPathGuarded: (pathname) => pathname !== "/api/events",
  });

  assertEquals(streamGuard(ownRequest("/api/events")), null);
  assertEquals(streamGuard(ownRequest("/api/window"))?.status, 403);
});
