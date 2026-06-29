import { describe, expect, it } from "vitest";
import { formatPrescriptionShort, formatRepsOrDuration } from "../client/src/lib/utils";

describe("Prescription Formatting Utilities", () => {
  describe("formatPrescriptionShort", () => {
    it("should format sets and reps only", () => {
      expect(formatPrescriptionShort(1, 8, null, null, { lang: "en" })).toBe("1 × 8");
      expect(formatPrescriptionShort(3, 10, null, null, { lang: "en", withLabels: true })).toBe("3 × 10 reps");
      expect(formatPrescriptionShort(3, 10, null, null, { lang: "kh", withLabels: true })).toBe("3 សិត × 10 ដង");
    });

    it("should format sets and duration only", () => {
      expect(formatPrescriptionShort(1, null, 1, 30, { lang: "en" })).toBe("1 × 1m 30s");
      expect(formatPrescriptionShort(2, null, null, 45, { lang: "en" })).toBe("2 × 45s");
      expect(formatPrescriptionShort(2, null, 2, null, { lang: "en" })).toBe("2 × 2m");
      expect(formatPrescriptionShort(1, null, 1, 30, { lang: "kh" })).toBe("1 × 1 នាទី 30 វិនាទី");
    });

    it("should format sets, reps, and duration together", () => {
      expect(formatPrescriptionShort(1, 8, 0, 30, { lang: "en" })).toBe("1 × 8 (30s)");
      expect(formatPrescriptionShort(1, 8, 1, 30, { lang: "en" })).toBe("1 × 8 (1m 30s)");
      expect(formatPrescriptionShort(3, 12, 1, null, { lang: "en", withLabels: true })).toBe("3 × 12 reps (1m)");
      expect(formatPrescriptionShort(3, 12, 1, null, { lang: "kh", withLabels: true })).toBe("3 សិត × 12 ដង (1 នាទី)");
    });
  });

  describe("formatRepsOrDuration", () => {
    it("should format reps only", () => {
      expect(formatRepsOrDuration(8, null, null, "en")).toBe("8 reps");
      expect(formatRepsOrDuration(1, null, null, "en")).toBe("1 rep");
      expect(formatRepsOrDuration(8, null, null, "kh")).toBe("8 ដង");
    });

    it("should format duration only", () => {
      expect(formatRepsOrDuration(null, 1, 30, "en")).toBe("1m 30s");
      expect(formatRepsOrDuration(null, null, 45, "en")).toBe("45s");
      expect(formatRepsOrDuration(null, 1, 30, "kh")).toBe("1 នាទី 30 វិនាទី");
    });

    it("should format both reps and duration", () => {
      expect(formatRepsOrDuration(8, 0, 30, "en")).toBe("8 reps (30s)");
      expect(formatRepsOrDuration(8, 1, 30, "en")).toBe("8 reps (1m 30s)");
      expect(formatRepsOrDuration(8, 1, 30, "kh")).toBe("8 ដង (1 នាទី 30 វិនាទី)");
    });
  });
});
