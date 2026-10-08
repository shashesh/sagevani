import type { CollectionBeforeChangeHook } from 'payload'

import { readingTime, searchTextFrom } from '../../lib/article-text'
import { countWords, extractText } from '../../lib/rich-text'

/** Reading time and search text, recomputed on every save, drafts included. */
export const deriveArticleText: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const body: unknown = data.body !== undefined ? data.body : originalDoc?.body
  const bodyText = extractText(body)
  return {
    ...data,
    readingTime: readingTime(countWords(bodyText)),
    searchText: searchTextFrom([
      data.title ?? originalDoc?.title,
      data.summary ?? originalDoc?.summary,
      bodyText,
    ]),
  }
}
