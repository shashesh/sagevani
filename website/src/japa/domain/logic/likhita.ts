/**
 * Normalise text for comparing a typed entry with the mantra. Lowercases by
 * Unicode's default rules, not the device's locale, so every devotee's entry
 * is compared the same way.
 */
export function normaliseForMatch(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
}

// A letter, mark or digit at the end or the start of a string. Marks matter:
// Devanagari vowel signs follow their consonant, so `राम` in `रामा` is part of
// a longer word.
const WORD_END = /[\p{L}\p{M}\p{N}]$/u
const WORD_START = /^[\p{L}\p{M}\p{N}]/u

/** Whether `left` and `right` join inside one word, so no entry ends between them. */
function joined(left: string, right: string): boolean {
  return WORD_END.test(left) && WORD_START.test(right)
}

/**
 * Likhita japa (typing): count how many complete repetitions of the mantra
 * the entry contains. Each correct entry is one repetition, whether entries
 * are separated by newlines, spaces or punctuation or typed back to back;
 * the mantra inside a longer word ("Om" in "Soma") is not an entry.
 * See docs/japa/product/features/chanting-modes.md#likhita-japa.
 */
export function countTypedRepetitions(entry: string, mantraText: string): number {
  const target = normaliseForMatch(mantraText)
  if (target.length === 0) return 0
  const text = normaliseForMatch(entry)
  let count = 0
  let from = 0
  let lastEnd = -1
  for (;;) {
    const found = text.indexOf(target, from)
    if (found === -1) return count
    const end = found + target.length
    // Two code units cover one character either side, even outside the BMP.
    const startsEntry =
      found === lastEnd || !joined(text.slice(Math.max(0, found - 2), found), target)
    const endsEntry = text.startsWith(target, end) || !joined(target, text.slice(end, end + 2))
    if (startsEntry && endsEntry) {
      count += 1
      lastEnd = end
      from = end
    } else {
      from = found + 1
    }
  }
}
