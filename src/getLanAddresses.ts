/**
 @fileoverview
 This machine's addresses on the local network -- which the guard needs to know
 what it may be addressed as, and mod.ts to say where it can be reached.
*/

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

//
//@export

export default getLanAddresses;
