/** Phone numbers are optional, but a stored one has to be dialable. */

const ALLOWED = /^[0-9+()\-.\s]+$/;

export function isValidPhone(input: string): boolean {
  const raw = input.trim();
  if (!ALLOWED.test(raw)) return false;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) return digits.startsWith('1');
  return digits.length === 10;
}

/** (555) 123-4567, so the Call button and the members list read the same. */
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return input.trim();
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
