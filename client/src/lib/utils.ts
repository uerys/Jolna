import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrescriptionShort(
  sets: number,
  reps: number | null | undefined,
  durationMin: number | null | undefined,
  durationSec: number | null | undefined,
  options?: {
    lang?: "en" | "kh";
    withLabels?: boolean;
  }
): string {
  const lang = options?.lang || "en";
  const withLabels = options?.withLabels ?? false;

  const hasReps = reps !== null && reps !== undefined && reps > 0;
  const hasDuration =
    (durationMin !== null && durationMin !== undefined && durationMin > 0) ||
    (durationSec !== null && durationSec !== undefined && durationSec > 0);

  const durText = [
    durationMin ? `${durationMin}${lang === "kh" ? " នាទី" : "m"}` : "",
    durationSec ? `${durationSec}${lang === "kh" ? " វិនាទី" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (lang === "kh") {
    if (hasReps && hasDuration) {
      return withLabels
        ? `${sets} សិត × ${reps} ដង (${durText})`
        : `${sets} × ${reps} ដង (${durText})`;
    } else if (hasReps) {
      return withLabels
        ? `${sets} សិត × ${reps} ដង`
        : `${sets} × ${reps}`;
    } else if (hasDuration) {
      return withLabels
        ? `${sets} សិត × ${durText}`
        : `${sets} × ${durText}`;
    }
    return withLabels ? `${sets} សិត` : `${sets} × 0`;
  } else {
    if (hasReps && hasDuration) {
      return withLabels
        ? `${sets} × ${reps} reps (${durText})`
        : `${sets} × ${reps} (${durText})`;
    } else if (hasReps) {
      return withLabels
        ? `${sets} × ${reps} reps`
        : `${sets} × ${reps}`;
    } else if (hasDuration) {
      return `${sets} × ${durText}`;
    }
    return withLabels ? `${sets} × 0 reps` : `${sets} × 0`;
  }
}

export function formatRepsOrDuration(
  reps: number | null | undefined,
  durationMin: number | null | undefined,
  durationSec: number | null | undefined,
  lang: "en" | "kh" = "en"
): string {
  const hasReps = reps !== null && reps !== undefined && reps > 0;
  const hasDuration =
    (durationMin !== null && durationMin !== undefined && durationMin > 0) ||
    (durationSec !== null && durationSec !== undefined && durationSec > 0);

  const durText = [
    durationMin ? `${durationMin}${lang === "kh" ? " នាទី" : "m"}` : "",
    durationSec ? `${durationSec}${lang === "kh" ? " វិនាទី" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (lang === "kh") {
    if (hasReps && hasDuration) {
      return `${reps} ដង (${durText})`;
    } else if (hasReps) {
      return `${reps} ដង`;
    } else if (hasDuration) {
      return durText;
    }
    return "";
  } else {
    if (hasReps && hasDuration) {
      const repsText = reps === 1 ? "rep" : "reps";
      return `${reps} ${repsText} (${durText})`;
    } else if (hasReps) {
      const repsText = reps === 1 ? "rep" : "reps";
      return `${reps} ${repsText}`;
    } else if (hasDuration) {
      return durText;
    }
    return "";
  }
}

