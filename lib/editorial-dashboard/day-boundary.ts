export const EDITORIAL_TIME_ZONE = "America/Montevideo";

function dateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EDITORIAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function editorialDayStart(now = new Date()): string {
  const { year, month, day } = dateParts(now);
  const reference = new Date(Date.UTC(year, month - 1, day, 12));
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone: EDITORIAL_TIME_ZONE,
    timeZoneName: "longOffset"
  }).formatToParts(reference).find((part) => part.type === "timeZoneName")?.value ?? "GMT-03:00";
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offsetName);
  const minutes = match ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1) : -180;
  return new Date(Date.UTC(year, month - 1, day) - minutes * 60_000).toISOString();
}
