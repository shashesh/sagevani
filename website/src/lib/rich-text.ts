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

/** The ids of images from a collection (`media` by default) anywhere in editor content, each once. */
export function findUploadIds(value: unknown, relationTo = 'media'): (number | string)[] {
  const ids: (number | string)[] = []
  const seen = new Set<string>()
  const visit = (node: LexicalNode): void => {
    if (node.type === 'upload' && node.relationTo === relationTo) {
      const id = idOf(node.value)
      if (id !== null && !seen.has(String(id))) {
        seen.add(String(id))
        ids.push(id)
      }
    }
    childrenOf(node).forEach(visit)
  }
  const root = rootOf(value)
  if (root) visit(root)
  return ids
}

export type LinkedKind = 'link' | 'relationship' | 'upload'
export interface LinkedDocument {
  kind: LinkedKind
  /** The raw value, whatever its type: callers must check it, never assume a string. */
  relationTo: unknown
  /** The raw document value: an id when it is well formed. */
  value: unknown
}

const linkedDocumentOf = (node: LexicalNode): LinkedDocument | undefined => {
  if (node.type === 'relationship' || node.type === 'upload') {
    return { kind: node.type, relationTo: node.relationTo, value: node.value }
  }
  if (node.type === 'link' || node.type === 'autolink') {
    const doc = (node.fields as { doc?: unknown } | null | undefined)?.doc
    if (doc === undefined || doc === null) return undefined
    return isNode(doc)
      ? { kind: 'link', relationTo: doc.relationTo, value: doc.value }
      : { kind: 'link', relationTo: undefined, value: undefined }
  }
  return undefined
}

/**
 * Every document the content might point at, with the raw `relationTo` and no filtering by type,
 * so a caller can refuse anything it doesn't expect: every relationship and upload node, and
 * every link or autolink that carries `fields.doc`, whatever its `linkType` says (Payload
 * populates `doc` regardless). A link with no `doc` is external and reports nothing. Payload
 * doesn't check these on the server, so collections do (see bodyLinksOnlyTo).
 */
export function findLinkedDocuments(value: unknown): LinkedDocument[] {
  const found: LinkedDocument[] = []
  const visit = (node: LexicalNode): void => {
    const linked = linkedDocumentOf(node)
    if (linked) found.push(linked)
    childrenOf(node).forEach(visit)
  }
  const root = rootOf(value)
  if (root) visit(root)
  return found
}
