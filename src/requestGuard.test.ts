/**
 @fileoverview
 Covers what the guard admits and what it refuses. Each check is the only thing
 between a page you happened to visit and a local server.
*/

import { assertEquals } from "@std/assert";

import getLanAddresses from "./getLanAddresses.ts";
import { createRequestGuard } from "./requestGuard.ts";

//
//@spec

//
//## createRequestGuard

const _PORT = 3080;

/** A request addressed to this server, as the page it served would send it. */
function _ownRequest(
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

const _guard = createRequestGuard({ port: _PORT });

/** Returns the reason the guard refused, or null when it admitted the request. */
async function _refusalReason(request: Request): Promise<string | null> {
  const refusal = _guard(request);
  if (refusal === null) return null;

  return (await refusal.text()).trim().replace("refused: ", "");
}
// - naming the check that fired is what keeps a spec from passing on a
//   refusal it didn't mean to provoke; a wrong Host refuses too

//### The Host check

Deno.test("createRequestGuard: admits the page the server itself sent", () => {
  assertEquals(_guard(_ownRequest("/index.html")), null);
});

Deno.test("createRequestGuard: admits every loopback name for the bound port", () => {
  for (const hostname of ["127.0.0.1", "localhost", "[::1]"]) {
    assertEquals(
      _guard(_ownRequest("/index.html", { host: `${hostname}:${_PORT}` })),
      null,
      hostname,
    );
  }
});

Deno.test("createRequestGuard: refuses a Host on a port this server isn't bound to", () => {
  assertEquals(
    _guard(_ownRequest("/index.html", { host: `127.0.0.1:${_PORT + 1}` }))
      ?.status,
    403,
  );
});

Deno.test("createRequestGuard: refuses the rebinding Host, which every same-origin check would pass", () => {
  const refusal = _guard(
    _ownRequest("/index.html", { host: `attacker.com:${_PORT}` }),
  );
  // - the page loaded from attacker.com, so the browser calls us its own
  //   origin and sends Sec-Fetch-Site: same-origin along with it

  assertEquals(refusal?.status, 403);
});

Deno.test("createRequestGuard: refuses an absolute-form target naming another host", () => {
  const refusal = _guard(
    new Request("http://evil.com/index.html", {
      headers: { host: `127.0.0.1:${_PORT}`, "sec-fetch-site": "same-origin" },
    }),
  );
  // - the Host header is this server's, so only the request target gives it
  //   away; `serveDir` redirects a directory to the URL's own host

  assertEquals(refusal?.status, 403);
});

Deno.test("createRequestGuard: admits a Host whatever its case or trailing dot", () => {
  for (const hostname of ["LOCALHOST", "LocalHost", "localhost."]) {
    assertEquals(
      _guard(_ownRequest("/index.html", { host: `${hostname}:${_PORT}` })),
      null,
      hostname,
    );
  }
});

//### The cross-site check

Deno.test("createRequestGuard: admits a client that sends no Sec-Fetch-Site at all", async () => {
  const request = new Request(`http://127.0.0.1:${_PORT}/index.html`, {
    headers: { host: `127.0.0.1:${_PORT}` },
  });
  // - not a browser, or a URL browsers don't send it for

  assertEquals(await _refusalReason(request), null);
});

Deno.test("createRequestGuard: admits the page's own subresources", async () => {
  for (const fetchSite of ["same-origin", "none"]) {
    assertEquals(
      await _refusalReason(
        _ownRequest("/index.html", { "sec-fetch-site": fetchSite }),
      ),
      null,
      fetchSite,
    );
  }
});

Deno.test("createRequestGuard: refuses a same-site fetch, since a site ignores the port", async () => {
  assertEquals(
    await _refusalReason(
      _ownRequest("/index.html", { "sec-fetch-site": "same-site" }),
    ),
    "cross-site request",
  );
  // - the other dev server on this machine, which is not the page we served
});

Deno.test("createRequestGuard: refuses a cross-site fetch", async () => {
  assertEquals(
    await _refusalReason(
      _ownRequest("/index.html", {
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "cors",
      }),
    ),
    "cross-site request",
  );
});

Deno.test("createRequestGuard: refuses a cross-site <script src> embed, though it sends no Origin", async () => {
  assertEquals(
    await _refusalReason(
      _ownRequest("/index.html", {
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-dest": "script",
      }),
    ),
    "cross-site request",
  );
  // - the absent CORS header would not have covered this one: no Origin, so
  //   nothing governs it
});

Deno.test("createRequestGuard: refuses a cross-site navigation wherever it lands", async () => {
  for (
    const destination of ["document", "iframe", "frame", "object", "embed"]
  ) {
    assertEquals(
      await _refusalReason(
        _ownRequest("/index.html", {
          "sec-fetch-site": "cross-site",
          "sec-fetch-mode": "navigate",
          "sec-fetch-dest": destination,
        }),
      ),
      "cross-site request",
      destination,
    );
  }
});

//### The mutation check

Deno.test("createRequestGuard: refuses a mutation carrying a foreign Origin", () => {
  assertEquals(
    _guard(_ownRequest("/api/ingest", { origin: "http://attacker.com" }, {
      method: "POST",
    }))?.status,
    403,
  );
});

Deno.test("createRequestGuard: admits a mutation sending no Origin, so scripts still work", () => {
  assertEquals(
    _guard(_ownRequest("/api/ingest", {}, { method: "POST" })),
    null,
  );
});

Deno.test("createRequestGuard: ignores a foreign Origin on a read, which can't act on its own", () => {
  assertEquals(
    _guard(_ownRequest("/api/window", { origin: "http://x.com" })),
    null,
  );
});

//### The client header

const _headerGuard = createRequestGuard({
  port: _PORT,
  clientHeader: "x-worldview",
});

Deno.test("createRequestGuard: refuses an API request missing the client header", () => {
  assertEquals(_headerGuard(_ownRequest("/api/window"))?.status, 403);
});

Deno.test("createRequestGuard: admits an API request carrying it, whatever its value", () => {
  assertEquals(
    _headerGuard(_ownRequest("/api/window", { "x-worldview": "" })),
    null,
  );
});

Deno.test("createRequestGuard: guards an escaped path, which a router may still decode", () => {
  assertEquals(_headerGuard(_ownRequest("/%61pi/window"))?.status, 403);
});

Deno.test("createRequestGuard: guards a path it cannot decode, rather than guessing", () => {
  assertEquals(_headerGuard(_ownRequest("/%c0%aeapi/window"))?.status, 403);
});

Deno.test("createRequestGuard: leaves page loads alone, since a navigation sets no headers", () => {
  assertEquals(_headerGuard(_ownRequest("/index.html")), null);
});

Deno.test("createRequestGuard: requires the header only where isPathGuarded says", () => {
  const streamGuard = createRequestGuard({
    port: _PORT,
    clientHeader: "x-worldview",
    isPathGuarded: (pathname) => pathname !== "/api/events",
  });

  assertEquals(streamGuard(_ownRequest("/api/events")), null);
  assertEquals(streamGuard(_ownRequest("/api/window"))?.status, 403);
});

//### The scheme's default port

// A browser leaves :80 and :443 out of Host and Origin, so a guard built with
// either never sees the port it was told about.

const _defaultPortGuard = createRequestGuard({ port: 80 });

Deno.test("createRequestGuard: admits a bare Host when the server is on port 80", () => {
  assertEquals(
    _defaultPortGuard(
      new Request("http://127.0.0.1/index.html", {
        headers: { host: "127.0.0.1", "sec-fetch-site": "same-origin" },
      }),
    ),
    null,
  );
});

Deno.test("createRequestGuard: admits a mutation whose Origin drops port 80 as well", () => {
  assertEquals(
    _defaultPortGuard(
      new Request("http://127.0.0.1/api/ingest", {
        method: "POST",
        headers: {
          host: "127.0.0.1",
          "sec-fetch-site": "same-origin",
          origin: "http://127.0.0.1",
        },
      }),
    ),
    null,
  );
});

Deno.test("createRequestGuard: refuses a bare Host on every other port, where a browser sends one", () => {
  assertEquals(
    _guard(_ownRequest("/index.html", { host: "127.0.0.1" }))?.status,
    403,
  );
});

//
//### The LAN

// Both loops are empty on a machine with no LAN address, so each test asserts
// something unconditional first.

Deno.test("createRequestGuard: admits this machine's LAN addresses when LAN access is allowed", () => {
  const lanGuard = createRequestGuard({ port: _PORT, isLanAllowed: true });

  assertEquals(lanGuard(_ownRequest("/index.html")), null);

  for (const address of getLanAddresses()) {
    assertEquals(
      lanGuard(_ownRequest("/index.html", { host: `${address}:${_PORT}` })),
      null,
      address,
    );
  }
});

Deno.test("createRequestGuard: refuses those same addresses when it isn't", () => {
  assertEquals(_guard(_ownRequest("/index.html")), null);

  for (const address of getLanAddresses()) {
    assertEquals(
      _guard(_ownRequest("/index.html", { host: `${address}:${_PORT}` }))
        ?.status,
      403,
      address,
    );
  }
});
