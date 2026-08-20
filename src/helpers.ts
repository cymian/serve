/**
 @fileoverview
 What mod.ts assembles a server out of, that isn't a decision of its own: the
 command-line parse.

 Internal to the package -- neither entrypoint deno.jsonc names re-exports it,
 so nothing here is reachable from outside.
*/

import type { ServeOptions } from "./mod.ts";

//
//@fns

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
