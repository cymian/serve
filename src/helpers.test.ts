/**
 @fileoverview
 Covers the command-line parse -- the decision a running server won't complain
 about getting wrong.
*/

import { assertEquals, assertMatch, assertThrows } from "@std/assert";

import { getLanAddresses, parseArgs } from "./helpers.ts";

//
//@main

//## parseArgs

Deno.test("parseArgs: nothing named leaves every option unset, so serve() picks the defaults", () => {
  assertEquals(parseArgs([]), {});
});

Deno.test("parseArgs: the long forms", () => {
  assertEquals(parseArgs(["--port", "3080", "--root", "src/", "--lan"]), {
    port: 3080,
    root: "src/",
    isLanAllowed: true,
  });
});

Deno.test("parseArgs: the short forms", () => {
  assertEquals(parseArgs(["-p", "9000", "-r", "dist"]), {
    port: 9000,
    root: "dist",
  });
});

Deno.test("parseArgs: an unknown flag is skipped without eating the arg after it", () => {
  assertEquals(parseArgs(["--nope", "--port", "3080"]), { port: 3080 });
});

Deno.test("parseArgs: directory listing is opt-in", () => {
  assertEquals(parseArgs(["--dir-listing"]), { isDirListingShown: true });
});

Deno.test("parseArgs: a port that isn't a number throws", () => {
  assertThrows(() => parseArgs(["-p", "abc"]), Error, "port number");
});

Deno.test("parseArgs: a flag missing its value throws", () => {
  assertThrows(() => parseArgs(["--root"]), Error, "needs a value");
});

//## getLanAddresses

/** IPv4 in dotted-quad form, which is the only shape getLanAddresses keeps. */
const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

Deno.test({
  name:
    "getLanAddresses: returns dotted-quad IPv4 addresses, never a loopback one",
  permissions: { sys: ["networkInterfaces"] },
  fn: () => {
    for (const address of getLanAddresses()) {
      assertMatch(address, IPV4_PATTERN);
      assertEquals(address.startsWith("127."), false, address);
    }
  },
});

Deno.test({
  name:
    "getLanAddresses: empty rather than throwing when the permission is absent",
  permissions: { sys: false },
  fn: () => {
    assertEquals(getLanAddresses(), []);
  },
});
