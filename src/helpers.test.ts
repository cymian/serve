/**
 @fileoverview
 Covers the command-line parse, where a wrong result serves the wrong directory
 or port without the server complaining.
*/

import { assertEquals, assertThrows } from "@std/assert";

import { parseArgs } from "./helpers.ts";

//
//@tests

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
