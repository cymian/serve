/**
 The guard a local server runs ahead of its routes: it admits the page that
 server itself sent and programs running on this machine, and refuses
 everything else before a route sees it.

 - **the binding it assumes**: every check here takes the server to be bound to
   this machine. One reachable from anywhere can't tell its own caller from a
   stranger, and none of this substitutes for authentication past loopback
 - **which checks apply**: a static server needs the first two; the rest earn
   their place once a route mutates something
 - **what it imports**: nothing but the address lookup, so a consumer taking
   the guard alone doesn't typecheck the static server or resolve its
   dependencies

 @module
*/

import getLanAddresses from "./getLanAddresses.ts";

/*
 @todos
 - allow a cross-site top-level navigation again if something needs one, e.g.
   an OAuth callback redirected back to localhost
   - require Sec-Fetch-Dest: document, which is the tab itself; an iframe,
     frame, object, or embed each name themselves instead
*/

//
//@types

/** How a guard decides, for one server on one port. */
export interface RequestGuardOptions {
  /**
   Port the server is listening on.
   - the bound port, not the requested one: port 0 gets assigned a real one,
      and a Host naming any other port is not addressing this server
  */
  port: number;
  /** Requests may arrive addressed to this machine's LAN addresses too. */
  isLanAllowed?: boolean;
  /**
   Header a guarded request must carry, e.g. `"x-worldview"`.
   - the value is never read; what protects is that a header outside the small
      set browsers treat as simple can't be sent without a successful
      preflight, and the shapes that reach a local server uninvited -- a
      no-cors send, a simple cross-origin POST -- can send neither
  */
  clientHeader?: string;
  /**
   Paths {@linkcode RequestGuardOptions.clientHeader | clientHeader} is
   required on.
   - defaults to everything under `/api/`, leaving page loads and assets to
      the checks above; a navigation can set no headers
  */
  isPathGuarded?: (pathname: string) => boolean;
}

/**
 Returns the refusal a request earns, or null when it may proceed.
 - @returns null for "allowed", so a call site reads
    `const refusal = guard(request); if (refusal) return refusal;`
*/
export type RequestGuard = (request: Request) => Response | null;

//
//@data

/** Names that reach a server without leaving the machine. */
const _LOOPBACK_HOSTNAMES = ["127.0.0.1", "localhost", "[::1]"];

/** Methods that only read, so a request using one changes nothing by arriving. */
const _READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Sec-Fetch-Site values that don't put the request on another site's behalf. */
const _ALLOWED_FETCH_SITES = [
  "same-origin", // same scheme, host, and port
  "same-site", // same scheme and domain, i.e. subdomain and port can differ
  "none", // a user-initiated load: a typed URL, a bookmark
  null, // header absent: not a browser, or not an origin it's sent to
];
// - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site
// - browsers set Sec-Fetch-* only for a potentially trustworthy URL, so a LAN
//   address over plain http arrives with none of them

//
//@fns

/**
 Returns true if the request's Sec-Fetch-Site is one a local server may answer.
 - every cross-site request is refused, whatever it asked for; a <script src>
    or <img> embed sends no Origin, so the absent CORS header does not stop the
    page reading what it loaded
 - true when no Sec-Fetch-Site arrives, since there is nothing to check -- a
    non-browser client, or an origin browsers don't set it for
*/
export function isFetchSiteAllowed(request: Request): boolean {
  return _ALLOWED_FETCH_SITES.includes(request.headers.get("sec-fetch-site"));
}

/**
 Builds the guard for a server already listening on
 {@linkcode RequestGuardOptions.port | options.port}.
 - the LAN addresses are read once here, so an address the machine gains later
    needs a restart to be addressable

 @example Guard a server of your own
 ```ts
 import { createRequestGuard } from "jsr:@cymian/serve/guard";

 const guard = createRequestGuard({ port: 3919, clientHeader: "x-myapp" });

 Deno.serve({ port: 3919, hostname: "127.0.0.1" }, (request) => {
   const refusal = guard(request);
   if (refusal) return refusal;

   return new Response("your routes here");
 });
 ```
*/
export function createRequestGuard(options: RequestGuardOptions): RequestGuard {
  const hostnames = [
    ..._LOOPBACK_HOSTNAMES,
    ...(options.isLanAllowed ? getLanAddresses() : []),
  ];

  const allowedHosts = new Set(
    hostnames.map((hostname) => `${hostname}:${options.port}`),
  );
  const allowedOrigins = new Set(
    [...allowedHosts].map((host) => `http://${host}`),
  );

  const isPathGuarded = options.isPathGuarded ??
    ((pathname: string) => pathname.startsWith("/api/"));

  return (request) => {
    // Reject a Host this server doesn't answer to

    const hostHeader = request.headers.get("host");

    if (
      !allowedHosts.has(_normalizeHost(new URL(request.url).host)) ||
      (hostHeader !== null && !allowedHosts.has(_normalizeHost(hostHeader)))
    ) {
      return _refuse("host not addressed to this server");
    }
    // - the DNS rebinding case, which every same-origin check would pass
    // - the URL is checked as well as the header because an absolute-form
    //   request target names its own host, and HTTP/2 sends no Host at all

    // Reject what a cross-site page asked for

    if (!isFetchSiteAllowed(request)) return _refuse("cross-site request");

    // Reject a mutation sent from a foreign origin

    const isMutation = !_READ_METHODS.has(request.method);
    const origin = request.headers.get("origin");

    if (isMutation && origin !== null && !allowedOrigins.has(origin)) {
      return _refuse("foreign origin");
    }
    // - an absent Origin means it wasn't a browser: the fetch spec appends one
    //   to every request whose method isn't GET or HEAD, leaving curl and
    //   scripts, which the loopback binding already scopes to this machine
    //   - so it holds only while the binding does; --lan gives it away

    // Require the client header wherever isPathGuarded asks for it

    if (
      options.clientHeader !== undefined &&
      isPathGuarded(new URL(request.url).pathname) &&
      request.headers.get(options.clientHeader) === null
    ) {
      return _refuse(`missing ${options.clientHeader}`);
    }

    return null;
  };
}

//
//@helpers

/** Returns the 403 a failed check earns, naming the check for devtools to read. */
function _refuse(reason: string): Response {
  return new Response(`refused: ${reason}\n`, { status: 403 });
}

/**
 Returns a host in the one form the allowlist holds, e.g. `LocalHost.:80` =>
 `localhost:80`.
 - a hostname is case-insensitive, and may carry the root label's trailing dot
*/
function _normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.(?=:|$)/, "");
}
