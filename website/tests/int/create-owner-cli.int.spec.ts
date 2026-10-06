import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

// Runs scripts/create-owner.ts the way `npm run owner:create` does, and returns everything it printed.
const runCli = (env: Record<string, string | undefined>) => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/create-owner.ts'], {
    env: { ...process.env, NODE_ENV: 'production', ...env },
    encoding: 'utf-8',
    timeout: 90_000,
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

describe('owner:create command', () => {
  it('exits 1 with a clear message when the owner details are missing', () => {
    const { status, output } = runCli({
      OWNER_EMAIL: undefined,
      OWNER_NAME: undefined,
      OWNER_PASSWORD: undefined,
    })
    expect(status).toBe(1)
    expect(output).toContain('Set OWNER_EMAIL, OWNER_NAME and OWNER_PASSWORD for this command.')
  })

  it('never prints the database password or the owner password when it fails', () => {
    const { status, output } = runCli({
      DATABASE_URL: 'postgres://owner:db-sekret-123@db.invalid:99999/sagevani',
      OWNER_EMAIL: 'owner@example.com',
      OWNER_NAME: 'Owner',
      OWNER_PASSWORD: 'owner-sekret-456',
    })
    expect(status).toBe(1)
    expect(output).not.toMatch(/db-sekret-123|owner-sekret-456/)
  })
})
