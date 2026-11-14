/** Ticket codes look like YCW26-K7MQ-3XPA. No 0/O or 1/I/L, so they are easy to read out at the door. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode(prefix = "YCW26") {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${prefix}-${s.slice(0, 4)}-${s.slice(4)}`;
}

export const isCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z0-9]{3,8}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(v);

/** p***********@gmail.com, like the reference email's order summary. */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user[0]}${"*".repeat(Math.max(3, user.length - 1))}@${domain}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
