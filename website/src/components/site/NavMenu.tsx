'use client'

import { usePathname } from 'next/navigation'
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'

/**
 * The phone menu: a <details> element, so it works without JavaScript. The header stays mounted
 * across client navigations, so this closes the menu when the path changes, on a click on any link
 * (the current page included), and on Escape,
 * which returns focus to the summary.
 */
export function NavMenu({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [pathname])

  const onKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    const menu = ref.current
    if (event.key !== 'Escape' || !menu?.open) return
    menu.open = false
    menu.querySelector('summary')?.focus()
  }

  return (
    <details
      ref={ref}
      className={className}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if ((event.target as Element).closest('a') && ref.current) ref.current.open = false
      }}
    >
      {children}
    </details>
  )
}
