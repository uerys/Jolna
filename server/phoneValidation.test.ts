import { describe, expect, it } from "vitest";
import { validateCambodianPhoneNumber } from "../shared/phoneValidation";

describe("Cambodian Phone Number Validation", () => {
  it("should validate correct local Cambodian phone numbers (9 or 10 digits starting with 0)", () => {
    expect(validateCambodianPhoneNumber("012345678")).toBe(true);
    expect(validateCambodianPhoneNumber("0971234567")).toBe(true);
    expect(validateCambodianPhoneNumber("015 123 456")).toBe(true);
    expect(validateCambodianPhoneNumber("070-123-4567")).toBe(true);
    expect(validateCambodianPhoneNumber("023 123 456")).toBe(true); // Landline Phnom Penh
    expect(validateCambodianPhoneNumber("(012) 345-678")).toBe(true);
  });

  it("should validate correct international Cambodian phone numbers", () => {
    expect(validateCambodianPhoneNumber("+85512345678")).toBe(true);
    expect(validateCambodianPhoneNumber("85512345678")).toBe(true);
    expect(validateCambodianPhoneNumber("+855 97 123 4567")).toBe(true);
    expect(validateCambodianPhoneNumber("855 70 123 456")).toBe(true);
    expect(validateCambodianPhoneNumber("+855 (97) 123-4567")).toBe(true);
  });

  it("should reject invalid phone numbers", () => {
    expect(validateCambodianPhoneNumber("")).toBe(false);
    expect(validateCambodianPhoneNumber("123456789")).toBe(false); // No prefix/leading 0
    expect(validateCambodianPhoneNumber("+855012345678")).toBe(false); // Leading zero after country code (standard is to drop it)
    expect(validateCambodianPhoneNumber("0123456")).toBe(false); // Too short
    expect(validateCambodianPhoneNumber("01234567890")).toBe(false); // Too long
    expect(validateCambodianPhoneNumber("abc")).toBe(false);
    expect(validateCambodianPhoneNumber("+1234567890")).toBe(false); // Wrong country code
  });
});
