import { spawnSync } from 'node:child_process'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { allowOwnerChange } from '@/collections/Users'
import { createOwner } from '@/lib/create-owner'
import config from '@/payload.config'

// Runs a script the way its npm command does, and returns everything it printed.
const runCli = (script: string, env: Record<string, string | undefined>) => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DOTENV_CONFIG_PATH: 'tests/no-such-env-file',
      ...env,
    },
    encoding: 'utf-8',
    timeout: 90_000,
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

// Each spawn can take up to 90s, so the suite timeout must sit above that.
describe('owner:create command', { timeout: 120_000 }, () => {
  const run = (env: Record<string, string | undefined>) => runCli('scripts/create-owner.ts', env)

  it('exits 1 with a clear message when the owner details are missing', () => {
    const { status, output } = run({
      OWNER_EMAIL: undefined,
      OWNER_NAME: undefined,
      OWNER_PASSWORD: undefined,
    })
    expect(status).toBe(1)
    expect(output).toContain('Set OWNER_EMAIL, OWNER_NAME and OWNER_PASSWORD for this command.')
  })

  it('never prints the database password or the owner password when the database refuses the connection', () => {
    const { status, output } = run({
      DATABASE_URL: 'postgres://owner:db-sekret-123@127.0.0.1:1/sagevani',
      OWNER_EMAIL: 'owner@example.com',
      OWNER_NAME: 'Owner',
      OWNER_PASSWORD: 'zq-sekret-4567-x',
    })
    expect(status).toBe(1)
    expect(output).not.toMatch(/db-sekret-123|zq-sekret-4567-x/)
  })
})

describe('owner:reset-password command', { timeout: 120_000 }, () => {
  const run = (env: Record<string, string | undefined>) =>
    runCli('scripts/reset-owner-password.ts', env)
  let payload: Payload

  const clearUsers = () =>
    payload.delete({
      collection: 'users',
      where: { id: { exists: true } },
      overrideAccess: true,
      context: allowOwnerChange(),
    })

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearUsers()
  })

  afterAll(async () => {
    await clearUsers()
    await payload.destroy()
  })

  it('exits 1 with a clear message when the new password is missing', () => {
    const { status, output } = run({ OWNER_PASSWORD: undefined })
    expect(status).toBe(1)
    expect(output).toContain('Set OWNER_PASSWORD to the new owner password for this command.')
  })

  it('never prints the database password or the new password when the database refuses the connection', () => {
    const { status, output } = run({
      DATABASE_URL: 'postgres://owner:db-sekret-123@127.0.0.1:1/sagevani',
      OWNER_PASSWORD: 'zq-sekret-4567-x',
    })
    expect(status).toBe(1)
    expect(output).not.toMatch(/db-sekret-123|zq-sekret-4567-x/)
  })

  it('resets the owner password so the new one signs in', async () => {
    await createOwner(payload, {
      email: 'owner@example.com',
      name: 'Owner',
      password: 'long-enough-password',
    })

    const { status, output } = run({ OWNER_PASSWORD: 'a-brand-new-passphrase' })

    expect(status).toBe(0)
    expect(output).toContain(
      'Password reset for owner@example.com. Every session was signed out, any API key was removed, and any login lock was cleared.',
    )
    const login = await payload.login({
      collection: 'users',
      data: { email: 'owner@example.com', password: 'a-brand-new-passphrase' },
    })
    expect(login.token).toEqual(expect.any(String))
  })
})
