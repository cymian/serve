/**
 @fileoverview
 Covers the command-line parse, where a wrong result serves the wrong directory
 or port without the server complaining.
*/

import { assertEquals, assertThrows } from "@std/assert";

import parseArgs from "./parseArgs.ts";

//
//@spec

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

Deno.test("parseArgs: a misspelled flag throws rather than quietly serving the defaults", () => {
  assertThrows(() => parseArgs(["--dir-listings"]), Error, "unknown argument");
});

Deno.test("parseArgs: a bare path throws, since the root is named by -r and not by position", () => {
  assertThrows(() => parseArgs(["src/"]), Error, "unknown argument");
});

Deno.test("parseArgs: directory listing is opt-in", () => {
  assertEquals(parseArgs(["--dir-listing"]), { isDirListingShown: true });
});

Deno.test("parseArgs: a port that isn't a number throws", () => {
  assertThrows(() => parseArgs(["-p", "abc"]), Error, "port number");
});

Deno.test("parseArgs: a port outside the 16-bit range throws", () => {
  for (const invalidPortArg of ["-1", "70000", "3.5", ""]) {
    assertThrows(() => parseArgs(["-p", invalidPortArg]), Error, "port number");
  }
});

Deno.test("parseArgs: a flag missing its value throws", () => {
  assertThrows(() => parseArgs(["--root"]), Error, "needs a value");
});
