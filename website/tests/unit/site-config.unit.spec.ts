import { afterEach, describe, expect, it, vi } from 'vitest'

import { LOCAL_SITE_URL, siteConfig, siteConfigFrom } from '@/lib/site/config'

const LOCAL_DATABASE = 'postgres://postgres:postgres@127.0.0.1:54329/sagevani'
const REMOTE_DATABASE = 'postgres://u:p@aws-0-us-east-2.pooler.supabase.com:6543/postgres'

describe('siteConfigFrom', () => {
  it('uses the local address and stays unindexed with nothing set', () => {
    expect(siteConfigFrom({ DATABASE_URL: LOCAL_DATABASE })).toEqual({
      url: LOCAL_SITE_URL,
      indexing: false,
    })
  })

  it('requires SITE_URL for a database that is not local', () => {
    expect(() => siteConfigFrom({ DATABASE_URL: REMOTE_DATABASE })).toThrowError(
      'SITE_URL is required for a database that is not local.',
    )
  })

  it('uses SITE_URL when it is set', () => {
    expect(
      siteConfigFrom({ DATABASE_URL: REMOTE_DATABASE, SITE_URL: 'https://sagevani.example' }).url,
    ).toBe('https://sagevani.example')
  })

  it('allows indexing only when SITE_INDEXING is on', () => {
    expect(siteConfigFrom({ DATABASE_URL: LOCAL_DATABASE, SITE_INDEXING: 'on' }).indexing).toBe(
      true,
    )
    expect(siteConfigFrom({ DATABASE_URL: LOCAL_DATABASE, SITE_INDEXING: 'off' }).indexing).toBe(
      false,
    )
  })
})

describe('siteConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads this process environment', () => {
    vi.stubEnv('SITE_INDEXING', 'on')
    expect(siteConfig().indexing).toBe(true)
  })
})
