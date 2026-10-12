export interface ShareLinks {
  whatsapp: string
  email: string
  x: string
}

/** Plain share links: none of them needs JavaScript (stage 3 design, 6.1). */
export function shareLinks(url: string, title: string): ShareLinks {
  const address = encodeURIComponent(url)
  const subject = encodeURIComponent(title)
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    email: `mailto:?subject=${subject}&body=${address}`,
    x: `https://x.com/intent/post?text=${subject}&url=${address}`,
  }
}
