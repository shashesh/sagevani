import { Literata } from 'next/font/google'

/**
 * Literata for all text, served from the site's own domain (website design 7.2). The latin and
 * latin-ext subsets hold every IAST letter. The variable font covers weights 400 and 500, and its
 * optical-size axis keeps small text sturdy and large text fine.
 */
export const literata = Literata({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-literata',
})
