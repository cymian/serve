/**
 @fileoverview
 Covers the command-line parse and the cross-site check -- the two decisions a
 running server won't complain about getting wrong.
*/

import { assertEquals, assertMatch, assertThrows } from "@std/assert";

import { getLanAddresses, isRequestAllowed, parseArgs } from "./helpers.ts";

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

//## isRequestAllowed

/** A request as a page on another site would have the browser send it. */
const crossSiteRequest = (headers: Record<string, string>) =>
  new Request("http://127.0.0.1/index.html", {
    headers: { "sec-fetch-site": "cross-site", ...headers },
  });

Deno.test("isRequestAllowed: a client that sends no Sec-Fetch-Site is allowed", () => {
  assertEquals(
    isRequestAllowed(new Request("http://127.0.0.1/index.html")),
    true,
  );
});

Deno.test("isRequestAllowed: the page's own subresources are allowed", () => {
  for (const site of ["same-origin", "same-site", "none"]) {
    assertEquals(
      isRequestAllowed(
        new Request("http://127.0.0.1/index.html", {
          headers: { "sec-fetch-site": site },
        }),
      ),
      true,
      site,
    );
  }
});

Deno.test("isRequestAllowed: a cross-site fetch is refused", () => {
  assertEquals(
    isRequestAllowed(crossSiteRequest({ "sec-fetch-mode": "cors" })),
    false,
  );
});

Deno.test("isRequestAllowed: a cross-site <script src> embed is refused, though it sends no Origin", () => {
  assertEquals(
    isRequestAllowed(crossSiteRequest({
      "sec-fetch-mode": "no-cors",
      "sec-fetch-dest": "script",
    })),
    false,
  );
});

Deno.test("isRequestAllowed: a cross-site navigation is refused wherever it lands", () => {
  for (
    const destination of ["document", "iframe", "frame", "object", "embed"]
  ) {
    assertEquals(
      isRequestAllowed(crossSiteRequest({
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": destination,
      })),
      false,
      destination,
    );
  }
});
