export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (!query) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let ti = 0;
  let lastMatch = -2;
  for (let qi = 0; qi < q.length; qi += 1) {
    const ch = q[qi];
    if (ch === ' ') continue;

    let found = -1;
    while (ti < t.length) {
      if (t[ti] === ch) {
        found = ti;
        break;
      }
      ti += 1;
    }
    if (found === -1) return null;
    if (found === lastMatch + 1) score += 8;
    const prev = found > 0 ? t.charAt(found - 1) : '';
    if (found === 0 || /[^a-z0-9]/.test(prev)) score += 5;
    score += 1;

    indices.push(found);
    lastMatch = found;
    ti += 1;
  }
  score -= target.length * 0.05;
  return { score, indices };
}

export function highlightSegments(
  text: string,
  indices: number[],
): Array<{ text: string; match: boolean }> {
  if (indices.length === 0) return [{ text, match: false }];
  const set = new Set(indices);
  const out: Array<{ text: string; match: boolean }> = [];
  let buffer = '';
  let bufferMatch = set.has(0);

  for (let i = 0; i < text.length; i += 1) {
    const isMatch = set.has(i);
    if (isMatch !== bufferMatch) {
      if (buffer) out.push({ text: buffer, match: bufferMatch });
      buffer = '';
      bufferMatch = isMatch;
    }
    buffer += text.charAt(i);
  }
  if (buffer) out.push({ text: buffer, match: bufferMatch });
  return out;
}