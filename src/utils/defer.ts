export function defer(fn: () => void): void {
  setTimeout(fn, 0);
}
