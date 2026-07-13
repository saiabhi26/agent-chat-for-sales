/**
 * Resolve the caller's IP from the `X-Forwarded-For` header.
 *
 * The header is a list, and it is only partially trustworthy. A client can send
 * its own `X-Forwarded-For`; a proxy *appends* the address it actually observed.
 * So the value arrives as "<whatever the client claimed>, <real IP>".
 *
 * We take the LAST entry — the one Render appended. Taking the first would let
 * anyone bypass the rate limiter by rotating a forged header, which would make
 * the limiter worse than useless: present, but not actually limiting.
 *
 * This assumes exactly one trusted proxy in front of us (Render's edge). That is
 * true today. If another proxy is ever added, this needs to count hops.
 */
export function clientIpFromForwardedFor(header: string | undefined): string {
  const entries = (header ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // No header means no proxy — local dev. One shared bucket is the safe
  // direction: it limits, rather than handing out an unlimited free pass.
  return entries.length > 0 ? entries[entries.length - 1] : "unknown";
}
