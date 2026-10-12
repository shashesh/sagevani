'use client'

import { useState } from 'react'

import styles from './ShareLinks.module.css'

type Status = 'idle' | 'copied' | 'failed'

const LABELS: Record<Status, string> = {
  idle: 'Copy link',
  copied: 'Link copied',
  failed: 'Copy failed',
}

/** The one share option that needs JavaScript. The new label is announced. */
export function CopyLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }
  return (
    <button type="button" className={styles.button} onClick={copy} aria-live="polite">
      {LABELS[status]}
    </button>
  )
}
