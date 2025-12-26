/**
 * A pseudo-random reset token using base-36 encoding.
 *
 * This function concatenates two random base-36 substrings to form a longer token.
 * Base-36 includes [0-9a-z], which helps create a compact and fairly unique string.
 *
 * Calculation:
 * - Math.random() generates a float between 0 (inclusive) and 1 (exclusive).
 * - .toString(36) converts it to base-36 (e.g., "0.q1zgf...").
 * - .substring(2, 15) skips the "0." and gets 13 characters.
 * - Concatenating two such parts gives a 26-character token.
 *
 * Note: This is not cryptographically secure and should not be used for high-security use cases.
 */
export function generateResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * A 6-digit numeric OTP (One-Time Password).
 *
 * This is useful for email OTP verification.
 *
 * Calculation:
 * - Math.random() * 900000 generates a number between 0 and 899999.
 * - Adding 100000 shifts it to the range 100000–999999 (always 6 digits).
 * - .toString() converts it to a string.
 *
 * Note: This is also not cryptographically secure. Consider using crypto.randomInt for better security.
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
