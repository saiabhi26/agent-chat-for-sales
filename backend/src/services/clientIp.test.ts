import { describe, it, expect } from "vitest";
import { clientIpFromForwardedFor } from "./clientIp";

describe("clientIpFromForwardedFor", () => {
  it("reads a single address", () => {
    expect(clientIpFromForwardedFor("203.0.113.7")).toBe("203.0.113.7");
  });

  it("takes the LAST entry, not the first", () => {
    // This is the whole point. A client can send its own X-Forwarded-For; the
    // proxy *appends* the address it actually saw. So the list arrives as
    // "<whatever the client claimed>, <real IP>". Trusting the first entry lets
    // an attacker rotate a fake header and bypass the rate limit entirely.
    expect(clientIpFromForwardedFor("1.1.1.1, 203.0.113.7")).toBe("203.0.113.7");
  });

  it("takes the last entry through multiple forged hops", () => {
    expect(clientIpFromForwardedFor("evil, 1.1.1.1, 2.2.2.2, 203.0.113.7")).toBe(
      "203.0.113.7"
    );
  });

  it("trims whitespace around entries", () => {
    expect(clientIpFromForwardedFor("1.1.1.1,   203.0.113.7  ")).toBe("203.0.113.7");
  });

  it("ignores empty trailing entries rather than returning an empty key", () => {
    // An empty key would bucket every such caller together — or worse, be
    // treated as a distinct unlimited caller.
    expect(clientIpFromForwardedFor("203.0.113.7, ")).toBe("203.0.113.7");
  });

  it("falls back to a shared key when the header is missing", () => {
    // Local dev has no proxy and therefore no header. Sharing one bucket is the
    // safe direction: it rate-limits, rather than handing out a free pass.
    expect(clientIpFromForwardedFor(undefined)).toBe("unknown");
    expect(clientIpFromForwardedFor("")).toBe("unknown");
    expect(clientIpFromForwardedFor("   ")).toBe("unknown");
  });
});
