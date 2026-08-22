/**
 @fileoverview
 Covers what the guard admits and what it refuses. Each check is the only thing
 between a page you happened to visit and a local server.
*/

import { assertEquals } from "@std/assert";

import getLanAddresses from "./getLanAddresses.ts";
import { createRequestGuard, isFetchSiteAllowed } from "./requestGuard.ts";

//
//@tests

//## isFetchSiteAllowed

/** A request as a page on another site would have the browser send it. */
function crossSiteRequest(headers: Record<string, string>): Request {
  return new Request("http://127.0.0.1/index.html", {
    headers: { "sec-fetch-site": "cross-site", ...headers },
  });
}

Deno.test("isFetchSiteAllowed: a client that sends no Sec-Fetch-Site is allowed", () => {
  assertEquals(
    isFetchSiteAllowed(new Request("http://127.0.0.1/index.html")),
    true,
  );
});

Deno.test("isFetchSiteAllowed: the page's own subresources are allowed", () => {
  for (const site of ["same-origin", "none"]) {
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

Deno.test("isFetchSiteAllowed: a same-site fetch is refused, since a site ignores the port", () => {
  assertEquals(
    isFetchSiteAllowed(
      new Request("http://127.0.0.1/index.html", {
        headers: { "sec-fetch-site": "same-site" },
      }),
    ),
    false,
  );
  // - the other dev server on this machine, which is not the page we served
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

Deno.test("createRequestGuard: refuses an absolute-form target naming another host", () => {
  const refusal = guard(
    new Request("http://evil.com/index.html", {
      headers: { host: `127.0.0.1:${_PORT}`, "sec-fetch-site": "same-origin" },
    }),
  );
  // - the Host header is this server's, so only the request target gives it
  //   away; serveDir redirects a directory to the URL's own host

  assertEquals(refusal?.status, 403);
});

Deno.test("createRequestGuard: admits a Host whatever its case or trailing dot", () => {
  for (const host of ["LOCALHOST", "LocalHost", "localhost."]) {
    assertEquals(
      guard(ownRequest("/index.html", { host: `${host}:${_PORT}` })),
      null,
      host,
    );
  }
});

Deno.test("createRequestGuard: refuses a foreign-origin request that is addressed correctly", () => {
  for (const site of ["cross-site", "same-site"]) {
    assertEquals(
      guard(ownRequest("/index.html", { "sec-fetch-site": site }))?.status,
      403,
      site,
    );
  }
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

Deno.test("createRequestGuard: guards an escaped path, which a router may still decode", () => {
  assertEquals(headerGuard(ownRequest("/%61pi/window"))?.status, 403);
});

Deno.test("createRequestGuard: guards a path it cannot decode, rather than guessing", () => {
  assertEquals(headerGuard(ownRequest("/%c0%aeapi/window"))?.status, 403);
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

//### The lan

// Both loops are empty on a machine with no LAN address, so each test asserts
// something unconditional first.

Deno.test("createRequestGuard: admits this machine's LAN addresses when the lan is allowed", () => {
  const lanGuard = createRequestGuard({ port: _PORT, isLanAllowed: true });

  assertEquals(lanGuard(ownRequest("/index.html")), null);

  for (const address of getLanAddresses()) {
    assertEquals(
      lanGuard(ownRequest("/index.html", { host: `${address}:${_PORT}` })),
      null,
      address,
    );
  }
});

Deno.test("createRequestGuard: refuses those same addresses when it isn't", () => {
  assertEquals(guard(ownRequest("/index.html")), null);

  for (const address of getLanAddresses()) {
    assertEquals(
      guard(ownRequest("/index.html", { host: `${address}:${_PORT}` }))?.status,
      403,
      address,
    );
  }
});
