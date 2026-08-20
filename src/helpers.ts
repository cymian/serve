/**
 @fileoverview
 What mod.ts assembles a server out of: the command-line parse and the LAN
 address lookup.

 Internal to the package -- neither entrypoint deno.jsonc names re-exports it,
 so nothing here is reachable from outside.
*/

import type { ServeOptions } from "./mod.ts";

//
//@fns

/**
 Returns this machine's IPv4 addresses on the local network.
 - empty when the networkInterfaces permission is absent, so a caller that only
    wants the URL for display doesn't have to hold it
*/
export function getLanAddresses(): string[] {
  try {
    return Deno.networkInterfaces()
      .filter((iface) =>
        iface.family === "IPv4" && !iface.address.startsWith("127.")
      )
      .map((iface) => iface.address);
  } catch {
    return [];
  }
}

/**
 Returns the options named by a command line.
 - unknown flags are ignored; a flag missing its value, or a port that isn't a
    number, throws
*/
export function parseArgs(args: string[]): ServeOptions {
  const options: ServeOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Flags taking a value consume and validate the arg after them

    if (arg === "--port" || arg === "-p") {
      const next: string | undefined = args[++i];
      if (next === undefined) throw new Error(`${arg} needs a value`);
      const port = Number(next);
      if (!Number.isInteger(port)) {
        throw new Error(`${arg} needs a port number, got "${next}"`);
      }
      options.port = port;
    } else if (arg === "--root" || arg === "-r") {
      const next: string | undefined = args[++i];
      if (next === undefined) throw new Error(`${arg} needs a value`);
      options.root = next;
    } // Bare flags
    else if (arg === "--lan") options.isLanAllowed = true;
    else if (arg === "--dir-listing") options.isDirListingShown = true;
  }

  return options;
}
