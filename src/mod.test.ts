/**
 @fileoverview
 Covers arg parsing, the bind address, and the response headers -- the things
 a caller can get wrong in a way a running server won't complain about.
*/

import { assertEquals, assertThrows } from "@std/assert";

import Serve from "./mod.ts";

//
//@main

//## parseArgs

Deno.test("parseArgs: nothing named leaves every option unset, so start() picks the defaults", () => {
  assertEquals(Serve.parseArgs([]), {});
});

Deno.test("parseArgs: the long forms", () => {
  assertEquals(Serve.parseArgs(["--port", "3080", "--root", "src/", "--lan"]), {
    port: 3080,
    root: "src/",
    isLanAllowed: true,
  });
});

Deno.test("parseArgs: the short forms", () => {
  assertEquals(Serve.parseArgs(["-p", "9000", "-r", "dist"]), {
    port: 9000,
    root: "dist",
  });
});

Deno.test("parseArgs: an unknown flag is skipped without eating the arg after it", () => {
  assertEquals(Serve.parseArgs(["--nope", "--port", "3080"]), { port: 3080 });
});

Deno.test("parseArgs: directory listing is opt-in", () => {
  assertEquals(Serve.parseArgs(["--dir-listing"]), { isDirListingShown: true });
});

Deno.test("parseArgs: a port that isn't a number throws", () => {
  assertThrows(() => Serve.parseArgs(["-p", "abc"]), Error, "port number");
});

Deno.test("parseArgs: a flag missing its value throws", () => {
  assertThrows(() => Serve.parseArgs(["--root"]), Error, "needs a value");
});

//## start

Deno.test("start: binds loopback when the lan is not allowed", async () => {
  const server = Serve.start({ port: 0 });
  assertEquals(server.addr.hostname, "127.0.0.1");
  await server.shutdown();
});

Deno.test("start: binds every interface when the lan is allowed", async () => {
  const server = Serve.start({ port: 0, isLanAllowed: true });
  assertEquals(server.addr.hostname, "0.0.0.0");
  await server.shutdown();
});

Deno.test("start: responses carry no-cache and no CORS header", async () => {
  const server = Serve.start({ port: 0, root: "src/" });
  const response = await fetch(`http://127.0.0.1:${server.addr.port}/mod.ts`);
  await response.text();

  assertEquals(
    response.headers.get("cache-control"),
    "no-cache, no-store, must-revalidate",
  );
  assertEquals(response.headers.get("access-control-allow-origin"), null);
  await server.shutdown();
});
