export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
