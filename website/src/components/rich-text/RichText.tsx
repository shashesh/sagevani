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
  return (
    <a href={href} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}

const convertersFor =
  (context: BodyContext): JSXConvertersFunction<NodeTypes> =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    link: ({ node, nodesToJSX }) => (
      <BodyLink
        href={bodyLinkHref(node.fields, context.links)}
        newTab={node.fields.newTab === true}
      >
        {nodesToJSX({ nodes: node.children })}
      </BodyLink>
    ),
    autolink: ({ node, nodesToJSX }) => (
      <BodyLink
        href={bodyLinkHref(node.fields, context.links)}
        newTab={node.fields.newTab === true}
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
