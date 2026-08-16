// utils/formatDate.ts
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // fallback if it's ever not a valid date

  const datePart = d.toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}