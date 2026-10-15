export const RAMCO_STARTED_ON = "2026-02-02";
export const RAMCO_STARTED_LABEL = "2 February 2026";
const [startYear, startMonth, startDay] =
  RAMCO_STARTED_ON.split("-").map(Number);

const indiaDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** Completed calendar months, using the joining date's local timezone. */
export function formatRamcoTenure(now: Date): string {
  const parts = indiaDate.formatToParts(now);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)?.value);
  const months = Math.max(
    0,
    (part("year") - startYear) * 12 +
      part("month") -
      startMonth -
      (part("day") < startDay ? 1 : 0),
  );
  if (months === 0) return "Less than a month";
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Number((months / 12).toFixed(1));
  return `${years} ${years === 1 ? "year" : "years"}`;
}
