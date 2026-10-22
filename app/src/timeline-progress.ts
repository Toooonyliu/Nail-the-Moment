export function timelinePosition(value: number, count: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(Math.max(0, count-1), value)) : 0;
}
export function timelineIndex(value: number, count: number): number {
  return Math.round(timelinePosition(value,count));
}
