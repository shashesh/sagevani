/** The browser tests' own port, so a dev server on 3000 with the dev database is never reused by mistake. */
export const E2E_PORT = 3100

export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`
