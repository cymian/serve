/**
 @fileoverview
 Covers the bind address, the response headers, and that a refused request gets
 a 403 -- what serve() wires together, rather than what the pieces decide.
*/

import { assertEquals, assertStringIncludes } from "@std/assert";

import { serve } from "./mod.ts";

//
//@tests

//## serve

Deno.test("serve: binds loopback when the lan is not allowed", async () => {
  const server = serve({ port: 0 });
  assertEquals(server.addr.hostname, "127.0.0.1");
  await server.shutdown();
});

Deno.test("serve: binds every interface when the lan is allowed", async () => {
  const server = serve({ port: 0, isLanAllowed: true });
  assertEquals(server.addr.hostname, "0.0.0.0");
  await server.shutdown();
});

Deno.test("serve: responses carry no-cache and no CORS header", async () => {
  const server = serve({ port: 0, root: "src/" });
  const response = await fetch(`http://127.0.0.1:${server.addr.port}/mod.ts`);
  await response.text();

  assertEquals(response.headers.get("cache-control"), "no-cache");
  assertEquals(response.headers.get("access-control-allow-origin"), null);
  await server.shutdown();
});

Deno.test("serve: an unchanged file revalidates to 304, so no-cache costs no transfer", async () => {
  const server = serve({ port: 0, root: "src/" });
  const url = `http://127.0.0.1:${server.addr.port}/mod.ts`;

  const first = await fetch(url);
  await first.text();

  const second = await fetch(url, {
    headers: { "if-none-match": first.headers.get("etag")! },
  });
  await second.body?.cancel();

  assertEquals(second.status, 304);
  await server.shutdown();
});

Deno.test("serve: a cross-site request gets a 403 instead of the file", async () => {
  const server = serve({ port: 0, root: "src/" });

  const response = await fetch(`http://127.0.0.1:${server.addr.port}/mod.ts`, {
    headers: { "sec-fetch-site": "cross-site", "sec-fetch-mode": "cors" },
  });
  await response.text();

  assertEquals(response.status, 403);
  await server.shutdown();
});

// The repo root is the fixture below: it holds dotfiles, and a src/ with no
// index.html.

Deno.test("serve: a dotfile is not served, so a stray .env stays unreadable", async () => {
  const server = serve({ port: 0, root: "." });

  const response = await fetch(
    `http://127.0.0.1:${server.addr.port}/.gitignore`,
  );
  await response.text();

  assertEquals(response.status, 404);
  await server.shutdown();
});

Deno.test("serve: a directory with no index.html is not listed", async () => {
  const server = serve({ port: 0, root: "." });

  const response = await fetch(`http://127.0.0.1:${server.addr.port}/src/`);
  await response.text();

  assertEquals(response.status, 404);
  await server.shutdown();
});

Deno.test("serve: isDirListingShown opts that listing back in", async () => {
  const server = serve({ port: 0, root: ".", isDirListingShown: true });

  const response = await fetch(`http://127.0.0.1:${server.addr.port}/src/`);
  const body = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(body, "mod.ts");
  await server.shutdown();
});
