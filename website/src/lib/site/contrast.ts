const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

const linear = (channel: number): number => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/** WCAG 2 relative luminance of a six-digit hex colour. */
export function relativeLuminance(hex: string): number {
  const match = HEX.exec(hex)
  if (!match) throw new Error(`Not a six-digit hex colour: ${hex}`)
  const [red, green, blue] = match.slice(1).map((part) => linear(parseInt(part, 16)))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** WCAG 2 contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  )
  return (lighter + 0.05) / (darker + 0.05)
}
