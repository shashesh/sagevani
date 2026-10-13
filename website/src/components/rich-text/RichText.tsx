import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import {
  RichText as LexicalRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import type { ReactNode } from 'react'

import { bodyImage, bodyLinkHref } from '@/lib/site/body'
import type { BodyContext, RichTextValue } from '@/lib/site/types'
import type { PracticeBlock, TraditionBlock, VerseBlock } from '@/payload-types'

import { PracticeBlockView } from './PracticeBlockView'
import styles from './RichText.module.css'
import { TraditionBlockView } from './TraditionBlockView'
import { VerseBlockView } from './VerseBlockView'

type NodeTypes = DefaultNodeTypes | SerializedBlockNode<VerseBlock | TraditionBlock | PracticeBlock>

/** A link, or only its text when the address isn't one the page may link to (stage 3 design, 4.2). */
function BodyLink({
  href,
  newTab,
  children,
}: {
  href: string | null
  newTab: boolean
  children: ReactNode
}) {
  if (!href) return <>{children}</>
  if (!newTab) return <a href={href}>{children}</a>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {/* Placeholder copy for the owner to approve (spec 9). */}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  )
}

/**
 * Converters are an allow-list: only what the editor can produce, plus ours. Tables are left
 * out (the editor can't make them, and Payload's converter writes inline background styles).
 * `unknown` renders nothing, instead of Payload's visible "unknown node".
 */
const convertersFor =
  (context: BodyContext): JSXConvertersFunction<NodeTypes> =>
  ({ defaultConverters }) => ({
    paragraph: defaultConverters.paragraph,
    text: defaultConverters.text,
    linebreak: defaultConverters.linebreak,
    tab: defaultConverters.tab,
    quote: defaultConverters.quote,
    horizontalrule: defaultConverters.horizontalrule,
    list: defaultConverters.list,
    unknown: ({ node }) => {
      const fields: unknown = 'fields' in node ? node.fields : undefined
      const blockType =
        node.type === 'block' && fields && typeof fields === 'object' && 'blockType' in fields
          ? ` (block "${String(fields.blockType)}")`
          : ''
      console.warn(
        `[RichText] No converter for node type "${node.type}"${blockType}; it is not shown.`,
      )
      return null
    },
    // The title is the page's h1, so a body "Heading 1" is an h2, and h5 and h6 are h4.
    heading: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children })
      if (node.tag === 'h3') return <h3>{children}</h3>
      if (node.tag === 'h4' || node.tag === 'h5' || node.tag === 'h6') return <h4>{children}</h4>
      return <h2>{children}</h2>
    },
    // Never Payload's own item for a check list: its role="checkbox" <li> fails accessibility
    // checks. A plain item with a decorative marker instead; a nested list keeps no marker.
    listitem: (args) => {
      const { node, nodesToJSX, parent } = args
      const isCheck = 'listType' in parent && parent.listType === 'check'
      if (!isCheck) {
        const standard = defaultConverters.listitem
        return typeof standard === 'function' ? standard(args) : null
      }
      const children = nodesToJSX({ nodes: node.children })
      if (node.children.some((child) => child.type === 'list')) {
        return <li className={styles.checkItem}>{children}</li>
      }
      return (
        <li value={node.value} className={styles.checkItem}>
          <span aria-hidden="true">{node.checked ? '☑' : '☐'} </span>
          {children}
          {/* Placeholder copy for the owner to approve (spec 9). */}
          <span className="visually-hidden">{node.checked ? ' (done)' : ' (not done)'}</span>
        </li>
      )
    },
    link: ({ node, nodesToJSX }) => (
      <BodyLink
        href={bodyLinkHref(node.fields, context.links)}
        newTab={node.fields?.newTab === true}
      >
        {nodesToJSX({ nodes: node.children })}
      </BodyLink>
    ),
    autolink: ({ node, nodesToJSX }) => (
      <BodyLink
        href={bodyLinkHref(node.fields, context.links)}
        newTab={node.fields?.newTab === true}
      >
        {nodesToJSX({ nodes: node.children })}
      </BodyLink>
    ),
    upload: ({ node }) => {
      const image = bodyImage(node, context.images)
      if (!image) return null
      return (
        <figure className={styles.figure}>
          <Image
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="(max-width: 720px) 100vw, 680px"
          />
        </figure>
      )
    },
    blocks: {
      verse: ({ node }) => <VerseBlockView fields={node.fields} />,
      tradition: ({ node }) => <TraditionBlockView fields={node.fields} />,
      practice: ({ node }) => <PracticeBlockView fields={node.fields} />,
    },
  })

/** An article's or page's body, rendered on the server. */
export function RichText({ data, context }: { data: RichTextValue | null; context: BodyContext }) {
  if (!data) return null
  return <LexicalRichText data={data} converters={convertersFor(context)} className={styles.body} />
}
