/**
 * Validates a Cambodian phone number.
 * Cambodian phone numbers are 9 or 10 digits total when starting with 0.
 * International format (+855 or 855) has 8 or 9 digits after the country code.
 * Non-digit characters like spaces, dashes, or parentheses are ignored during validation.
 */
export function validateCambodianPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  // Clean the phone number by removing spaces, hyphens, and parentheses
  const clean = phone.replace(/[\s\-\(\)]/g, "");
  // starts with +855, 855, or 0; then a non-zero digit; then 7 or 8 digits
  return /^(?:\+855|855|0)[1-9]\d{7,8}$/.test(clean);
}
