'use client'

import { useEffect, useRef, useState } from 'react'

import styles from './ShareLinks.module.css'

type Outcome = 'copied' | 'failed' | null

const MESSAGES: Record<'copied' | 'failed', string> = {
  copied: 'Link copied',
  failed: 'Copy failed',
}

const MESSAGE_MS = 3000

/** The one share option that needs JavaScript. The label stays put; the outcome is announced. */
export function CopyLinkButton({ url }: { url: string }) {
  const [outcome, setOutcome] = useState<Outcome>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const frame = useRef(0)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
      cancelAnimationFrame(frame.current)
    },
    [],
  )

  // Clearing first, then setting on the next frame, makes a repeat click announce again.
  const show = (next: 'copied' | 'failed'): void => {
    clearTimeout(timer.current)
    cancelAnimationFrame(frame.current)
    setOutcome(null)
    frame.current = requestAnimationFrame(() => {
      setOutcome(next)
      timer.current = setTimeout(() => setOutcome(null), MESSAGE_MS)
    })
  }
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url)
      show('copied')
    } catch {
      show('failed')
    }
  }
  return (
    <>
      <button type="button" className={styles.button} onClick={copy}>
        Copy link
      </button>
      <span role="status" className={styles.status}>
        {outcome ? MESSAGES[outcome] : ''}
      </span>
    </>
  )
}
