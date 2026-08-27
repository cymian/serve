/**
 @fileoverview
 Covers the bind address, the response headers, the 403 a refused request gets,
 and what the startup warnings say about an unservable root -- what `serve()`
 wires together, rather than what the pieces decide.
*/

import { assertEquals, assertStringIncludes } from "@std/assert";

import { serve } from "./mod.ts";

//
//@spec

//## serve

Deno.test("serve: binds loopback when LAN access is not allowed", async () => {
  const server = serve({ port: 0 });
  assertEquals(server.addr.hostname, "127.0.0.1");
  await server.shutdown();
});

Deno.test("serve: binds every interface when LAN access is allowed", async () => {
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

  const initialResponse = await fetch(url);
  await initialResponse.text();

  const revalidationResponse = await fetch(url, {
    headers: { "if-none-match": initialResponse.headers.get("etag")! },
  });
  await revalidationResponse.body?.cancel();

  assertEquals(revalidationResponse.status, 304);
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
  const directoryListing = await response.text();

  assertEquals(response.status, 200);
  assertStringIncludes(directoryListing, "mod.ts");
  await server.shutdown();
});

//## The served root

/** Returns the lines `serve()` printed as it started on the given root. */
async function _startupLines(root: string): Promise<string[]> {
  const lines: string[] = [];
  const originalConsoleLog = console.log;
  console.log = (line: string) => void lines.push(line);

  try {
    const server = serve({ port: 0, root });
    await server.shutdown();
  } finally {
    console.log = originalConsoleLog;
  }

  return lines;
}

Deno.test("serve: a root that doesn't exist says so, rather than 404ing in silence", async () => {
  const lines = await _startupLines("srcc/");

  assertStringIncludes(lines.join("\n"), '"srcc/" does not exist');
});

Deno.test("serve: a root the build hasn't made yet serves as soon as it appears", async () => {
  const root = ".test-dist";
  const server = serve({ port: 0, root });

  const missingRootResponse = await fetch(
    `http://127.0.0.1:${server.addr.port}/`,
  );
  await missingRootResponse.text();

  assertEquals(missingRootResponse.status, 404);

  Deno.mkdirSync(root);
  // - outside the try, so the cleanup only ever removes what this test created

  try {
    Deno.writeTextFileSync(`${root}/index.html`, "<h1>built</h1>");

    const createdRootResponse = await fetch(
      `http://127.0.0.1:${server.addr.port}/`,
    );
    const createdRootBody = await createdRootResponse.text();

    assertEquals(createdRootResponse.status, 200);
    assertStringIncludes(createdRootBody, "built");
  } finally {
    Deno.removeSync(root, { recursive: true });
    await server.shutdown();
  }
});

Deno.test("serve: a root naming a file says which it is, not just that it isn't a directory", async () => {
  const lines = await _startupLines("src/mod.ts");

  assertStringIncludes(
    lines.join("\n"),
    '"src/mod.ts" is a file, not a directory',
  );
});

Deno.test("serve: a file root really does 500, which is what its warning promises", async () => {
  const server = serve({ port: 0, root: "src/mod.ts" });

  const response = await fetch(`http://127.0.0.1:${server.addr.port}/mod.ts`);
  await response.text();

  assertEquals(response.status, 500);
  await server.shutdown();
});

Deno.test("serve: a trailing slash on the root changes nothing", async () => {
  for (const root of ["src", "src/", "./src", "./src/"]) {
    const server = serve({ port: 0, root });

    const response = await fetch(`http://127.0.0.1:${server.addr.port}/mod.ts`);
    await response.text();

    assertEquals(response.status, 200, root);
    await server.shutdown();
  }
});

Deno.test("serve: a root that exists prints the URL and nothing else", async () => {
  const lines = await _startupLines("src/");

  assertEquals(lines.length, 1);
  assertStringIncludes(lines[0], "Local:");
});

Deno.test({
  name:
    "serve: a root outside -R names the permission, rather than blaming the path",
  permissions: { read: ["src"], net: ["127.0.0.1"] },
  fn: async () => {
    const lines = await _startupLines(".");

    assertStringIncludes(lines.join("\n"), '-R does not cover "."');
  },
});

Deno.test({
  name: "serve: a request outside -R 500s, and one inside it is still served",
  permissions: { read: ["src"], net: ["127.0.0.1"] },
  fn: async () => {
    const server = serve({ port: 0, root: "." });
    const url = `http://127.0.0.1:${server.addr.port}`;

    const outsidePermissionResponse = await fetch(`${url}/README.md`);
    await outsidePermissionResponse.text();
    const insidePermissionResponse = await fetch(`${url}/src/mod.ts`);
    await insidePermissionResponse.text();

    assertEquals(outsidePermissionResponse.status, 500);
    assertEquals(insidePermissionResponse.status, 200);
    // - so the warning says "requests outside -R", not "every request"

    await server.shutdown();
  },
});
