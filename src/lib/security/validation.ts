/**
 * Robust email validator complying with standard RFC 5322 specs.
 * Requires valid username, @ symbol, valid domain name, and at least a 2-character TLD.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  if (clean.length < 5 || clean.length > 254) return false;
  if (!EMAIL_REGEX.test(clean)) return false;

  // Domain checks
  const parts = clean.split("@");
  if (parts.length !== 2) return false;
  const domain = parts[1];
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;

  return true;
}
