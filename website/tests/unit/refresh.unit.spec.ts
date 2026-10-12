import { revalidateTag } from 'next/cache'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refreshSite, SITE_TAG } from '@/lib/site/refresh'

vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag: vi.fn(),
}))

const logger = { error: vi.fn() }

describe('refreshSite', () => {
  beforeEach(() => {
    vi.mocked(revalidateTag).mockReset()
    logger.error.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does nothing outside Next, where there is no page to refresh', () => {
    vi.stubEnv('NEXT_RUNTIME', '')
    refreshSite(logger)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('expires the site tag at once inside Next', () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    refreshSite(logger)
    expect(revalidateTag).toHaveBeenCalledWith(SITE_TAG, { expire: 0 })
  })

  it('logs a failure and never throws, so the save stands', () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.mocked(revalidateTag).mockImplementation(() => {
      throw new Error('no store')
    })
    expect(() => refreshSite(logger)).not.toThrow()
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      expect.stringContaining('could not be refreshed'),
    )
  })
})
