/**
 The command-line parse behind mod.ts's CLI entry: argv in, ServeOptions out.

 Internal to the package -- deno.jsonc's exports name neither this module nor
 a re-export of it, so nothing here is reachable from outside.

 @module
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

    // Consume and validate the arg after a flag that takes a value

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
    } else if (arg === "--lan") options.isLanAllowed = true;
    else if (arg === "--dir-listing") options.isDirListingShown = true;
  }

  return options;
}
