// Helpers de data — formatação pt-PT e parsing seguro de "YYYY-MM-DD".

/** Converte "YYYY-MM-DD" (ou "") numa Date em UTC, ou null. */
export function parseDateOnly(s: unknown): Date | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
}

/** "YYYY-MM-DD" para inputs <input type="date">. */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** Ex.: "qua, 25 jun". */
export function fmtShort(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC", // datas são guardadas como meia-noite UTC (@db.Date)
  });
}

export function fmtLong(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const fmtMoney = (v: number) =>
  "€" +
  v.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
