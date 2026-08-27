/**
 @fileoverview
 Covers the lookup's two outcomes: the addresses, and the empty list it returns
 in place of throwing when the permission is absent.
*/

import { assertEquals, assertMatch } from "@std/assert";

import getLanAddresses from "./getLanAddresses.ts";

//
//@spec

/** IPv4 in dotted-quad form, which is the only shape `getLanAddresses()` keeps. */
const _IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

Deno.test({
  name:
    "getLanAddresses: returns dotted-quad IPv4 addresses, never a loopback or link-local one",
  permissions: { sys: ["networkInterfaces"] },
  fn: () => {
    for (const address of getLanAddresses()) {
      assertMatch(address, _IPV4_PATTERN);
      assertEquals(address.startsWith("127."), false, address);
      assertEquals(address.startsWith("169.254."), false, address);
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
