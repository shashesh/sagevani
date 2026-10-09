import type { CollectionBeforeChangeHook } from 'payload'

import { readingTime, searchTextFrom } from '../../lib/article-text'
import { countWords, extractText } from '../../lib/rich-text'

/**
 * Reading time and search text, recomputed on every save, drafts included. They come from the
 * document being saved: Payload has already filled any field missing from `data` with its stored
 * value, so falling back to the previous document would only bring back text the editor cleared.
 */
export const deriveArticleText: CollectionBeforeChangeHook = ({ data }) => {
  const bodyText = extractText(data.body)
  return {
    ...data,
    readingTime: readingTime(countWords(bodyText)),
    searchText: searchTextFrom([data.title, data.summary, bodyText]),
  }
}
