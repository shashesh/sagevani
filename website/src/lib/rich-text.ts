/**
 * Reads Payload's serialized Lexical content without the editor. Only the parts this module needs
 * are typed; everything is checked at runtime, so malformed content gives empty results.
 */
interface LexicalNode {
  type?: unknown
  text?: unknown
  children?: unknown
  fields?: unknown
  relationTo?: unknown
  value?: unknown
}

// Nodes that sit inside a line of text. Everything else is a block and starts a new line.
const INLINE_TYPES = new Set(['text', 'link', 'autolink', 'linebreak', 'tab'])
// Block fields that are Payload's bookkeeping, not content.
const BLOCK_META_FIELDS = new Set(['id', 'blockName', 'blockType'])

const isNode = (value: unknown): value is LexicalNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const childrenOf = (node: LexicalNode): LexicalNode[] =>
  Array.isArray(node.children) ? node.children.filter(isNode) : []

function textOf(node: LexicalNode): string {
  if (node.type === 'text') return typeof node.text === 'string' ? node.text : ''
  if (node.type === 'linebreak') return '\n'
  if (node.type === 'tab') return ' '
  if (node.type === 'block' && isNode(node.fields)) {
    return Object.entries(node.fields)
      .filter(([key, value]) => !BLOCK_META_FIELDS.has(key) && typeof value === 'string')
      .map(([, value]) => value as string)
      .join('\n')
  }
  const children = childrenOf(node)
  const inline = children.every((child) => INLINE_TYPES.has(String(child.type)))
  return children.map(textOf).join(inline ? '' : '\n')
}

const rootOf = (value: unknown): LexicalNode | undefined =>
  isNode(value) && isNode((value as { root?: unknown }).root)
    ? (value as { root: LexicalNode }).root
    : undefined

/** The plain text of editor content, block fields included: one line per paragraph or block. */
export function extractText(value: unknown): string {
  const root = rootOf(value)
  if (!root) return ''
  return textOf(root)
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** Words in any script: a letter or digit, then letters, combining marks, digits or apostrophes. */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’]*/gu)?.length ?? 0
}

const idOf = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (isNode(value)) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/** The ids of images from a collection (`media` by default) anywhere in editor content. */
export function findUploadIds(value: unknown, relationTo = 'media'): (number | string)[] {
  const ids: (number | string)[] = []
  const visit = (node: LexicalNode): void => {
    if (node.type === 'upload' && node.relationTo === relationTo) {
      const id = idOf(node.value)
      if (id !== null) ids.push(id)
    }
    childrenOf(node).forEach(visit)
  }
  const root = rootOf(value)
  if (root) visit(root)
  return ids
}
