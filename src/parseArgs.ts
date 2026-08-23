/**
 The command-line parse behind mod.ts's CLI entry: argv in,
 {@linkcode ServeOptions} out.

 Internal to the package -- deno.jsonc's exports name neither this module nor
 a re-export of it, so nothing here is reachable from outside.

 @module
*/

import type { ServeOptions } from "./mod.ts";

//
//@fns

/**
 Returns the options named by a command line.
 - anything unrecognized throws, as does a flag missing its value or a port
    that isn't a whole number in 0-65535
 - `--help` and `--version` never reach here; mod.ts's CLI entry answers
    them first
*/
function parseArgs(args: string[]): ServeOptions {
  const options: ServeOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      // Flags taking a value consume the arg after them

      case "--port":
      case "-p": {
        const value = _takeValue(arg, args[++i]);
        if (!/^\d+$/.test(value) || Number(value) > 65535) {
          throw new Error(`${arg} needs a port number, got "${value}"`);
        }
        options.port = Number(value);
        break;
      }
      case "--root":
      case "-r":
        options.root = _takeValue(arg, args[++i]);
        break;

      // Bare flags

      case "--lan":
        options.isLanAllowed = true;
        break;
      case "--dir-listing":
        options.isDirListingShown = true;
        break;

      default:
        throw new Error(`unknown argument "${arg}"; try --help`);
    }
  }

  return options;
}

//
//@helpers

/**
 Returns the arg a flag consumes; throws naming the flag when it's absent.
*/
function _takeValue(flag: string, next: string | undefined): string {
  if (next === undefined) throw new Error(`${flag} needs a value`);
  return next;
}

//
//@export

export default parseArgs;
