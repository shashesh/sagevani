import { useScenario } from './scenario'

/**
 * Resets and seeds the test database with the `standard` scenario, through the running server,
 * before every browser test run. See scenario.ts for what that saves and why, and
 * tests/e2e/README.md for the pattern a test must follow if it switches scenario mid-run.
 */
export default async function globalSetup(): Promise<void> {
  // Not a React hook: eslint-plugin-react-hooks only flags the name's "use" prefix.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  await useScenario('standard')
}
