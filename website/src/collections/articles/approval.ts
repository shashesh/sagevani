import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

type Approval = {
  approvedAt?: string | null
  approvedBy?: number | string | { id: number | string } | null
  versionId?: string | null
}

type ApprovableDoc = {
  _status?: 'draft' | 'published' | null
  approval?: Approval | null
  id: number | string
}

const idOf = (value: Approval['approvedBy']): number | string | null =>
  value !== null && typeof value === 'object' ? value.id : (value ?? null)

/**
 * Publishing is the owner's approval (website design, 8.3). Every save that publishes records
 * who approved it and when, and sets publishedAt the first time. The version id is not known
 * until Payload saves the version, so it starts empty and recordApprovedVersion fills it in.
 */
export const recordApproval: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (data._status !== 'published') return data
  const now = new Date().toISOString()
  return {
    ...data,
    publishedAt: originalDoc?.publishedAt ?? now,
    approval: { approvedBy: req.user?.id ?? null, approvedAt: now, versionId: null },
  }
}

/**
 * Runs after Payload has saved the version, so the newest version is the one just published.
 * Writes its id onto the live document only, through the database adapter, so no extra version
 * is created and no hooks run again.
 */
export const recordApprovedVersion: CollectionAfterChangeHook<ApprovableDoc> = async ({
  collection,
  doc,
  req,
}) => {
  if (doc._status !== 'published' || !doc.approval || doc.approval.versionId) return doc

  const { docs } = await req.payload.db.findVersions({
    collection: collection.slug,
    where: { parent: { equals: doc.id } },
    sort: '-createdAt',
    limit: 1,
    pagination: false,
    req,
  })
  const versionId = docs[0] ? String(docs[0].id) : null
  const approval = { ...doc.approval, approvedBy: idOf(doc.approval.approvedBy), versionId }

  await req.payload.db.updateOne({
    collection: collection.slug,
    id: doc.id,
    data: { approval },
    req,
  })
  // The version's own snapshot must carry its id too: a later unpublish builds the live document
  // from the newest version, and would otherwise write an empty versionId back.
  if (docs[0]) {
    await req.payload.db.updateVersion({
      collection: collection.slug,
      id: docs[0].id,
      versionData: { version: { approval } },
      req,
    })
  }
  return { ...doc, approval: { ...doc.approval, versionId } }
}
