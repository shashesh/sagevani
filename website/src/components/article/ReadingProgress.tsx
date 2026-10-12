'use client'

import { useEffect, useRef } from 'react'

import { readingProgress } from '@/lib/site/progress'

import styles from './ReadingProgress.module.css'

/** A thin accent line under the sticky header, filling as the reader moves through the body. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = document.getElementById(targetId)
    const line = bar.current
    if (!target || !line) return
    let frame = 0
    const update = (): void => {
      frame = 0
      const { top, height } = target.getBoundingClientRect()
      line.style.transform = `scaleX(${readingProgress(top, height, window.innerHeight)})`
    }
    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [targetId])

  return <div ref={bar} className={styles.progress} aria-hidden="true" />
}
