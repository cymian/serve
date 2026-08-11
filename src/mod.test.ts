/**
 @fileoverview
 Covers arg parsing and the bind address -- the two things a caller can get
 wrong in a way the running server won't complain about.
*/

import { describe, expect, it, spec } from "@cymian/speck";

import Serve from "./mod.ts";

//
//@main

spec({
  name: "Serve.parseArgs",
  fn: Serve.parseArgs,
  produces: [
    "nothing named leaves every option unset, so start() picks the defaults",
    { args: [[]], expected: {} },
    "the long forms",
    {
      args: [["--port", "3080", "--root", "src/", "--lan"]],
      expected: { port: 3080, root: "src/", isLanAllowed: true },
    },
    "the short forms",
    {
      args: [["-p", "9000", "-r", "dist"]],
      expected: { port: 9000, root: "dist" },
    },
    "an unknown flag is skipped without eating the arg after it",
    { args: [["--nope", "--port", "3080"]], expected: { port: 3080 } },
    "directory listing is opt-in",
    { args: [["--dir-listing"]], expected: { isDirListingShown: true } },
  ],
});

describe("Serve.start", () => {
  it("binds loopback when the lan is not allowed", async () => {
    const server = Serve.start({ port: 0 });
    expect((server.addr as Deno.NetAddr).hostname).to.equal("127.0.0.1");
    await server.shutdown();
  });

  it("binds every interface when the lan is allowed", async () => {
    const server = Serve.start({ port: 0, isLanAllowed: true });
    expect((server.addr as Deno.NetAddr).hostname).to.equal("0.0.0.0");
    await server.shutdown();
  });
});
