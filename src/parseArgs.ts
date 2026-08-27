/**
 Exports `parseArgs()`, the command-line parser behind `mod.ts`: command-line
 args in, {@linkcode ServeOptions} out.

 Internal to the package -- `deno.jsonc`'s exports name neither this module nor
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
 - `--help` and `--version` never reach here; `mod.ts`'s CLI entry answers
    them first
*/
function parseArgs(args: string[]): ServeOptions {
  const options: ServeOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      // Consume the arg after a value-taking flag

      case "--port":
      case "-p": {
        const portArg = _takeValue(arg, args[++i]);
        if (!/^\d+$/.test(portArg) || Number(portArg) > 65535) {
          throw new Error(`${arg} needs a port number, got "${portArg}"`);
        }
        options.port = Number(portArg);
        break;
      }
      case "--root":
      case "-r":
        options.root = _takeValue(arg, args[++i]);
        break;

      // Set options from bare flags

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
function _takeValue(flag: string, nextArg: string | undefined): string {
  if (nextArg === undefined) throw new Error(`${flag} needs a value`);
  return nextArg;
}

//
//@export

export default parseArgs;
