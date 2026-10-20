import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// A starting header/footer navigation (stage 3 design, 5.4): with none set, the header shows only
// the wordmark and the theme toggle. About and Contact point at Pages documents the owner still
// has to write; the links 404 until those are published. The owner's to edit from here (add,
// reorder, remove) in Site settings.
const NAVIGATION = [
  { label: 'Start here', path: '/start-here' },
  { label: 'Articles', path: '/articles' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const settings = await payload.findGlobal({ slug: 'siteSettings', depth: 0, req })
  const existing: { label?: string; path?: string }[] = settings.navigation ?? []
  if (existing.length > 0) return // Leave an owner-edited navigation alone.

  await payload.updateGlobal({
    slug: 'siteSettings',
    data: { navigation: NAVIGATION },
    req,
  })
}

// Only undoes this migration's own effect: an empty navigation that still matches what it set.
// A navigation the owner has since edited is left alone, on either side.
export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  const settings = await payload.findGlobal({ slug: 'siteSettings', depth: 0, req })
  const current: { label?: string; path?: string }[] = settings.navigation ?? []
  const unchanged =
    current.length === NAVIGATION.length &&
    current.every((item, index) => {
      const seeded = NAVIGATION[index]
      return item.label === seeded.label && item.path === seeded.path
    })
  if (!unchanged) return

  await payload.updateGlobal({
    slug: 'siteSettings',
    data: { navigation: [] },
    req,
  })
}
