// npm run japa:content:build -- --channel development|production [--release N]
// Lists every problem, or writes the packs, the manifest and the snapshot.
import { join, relative } from 'node:path'

import { build, parseBuildArgs } from '../src/japa/catalog-build/build'
import { CONTENT_ROOT, OUTPUT_ROOT, SNAPSHOT_ROOT } from '../src/japa/catalog-build/files'
import { formatIssue, plural } from '../src/japa/catalog-build/report'

const args = parseBuildArgs(process.argv.slice(2))
if (!args.ok) {
  console.error(args.message)
  process.exit(2)
}

const outDir = join(OUTPUT_ROOT, args.channel)
const { issues, manifest } = build({
  channel: args.channel,
  release: args.release,
  contentRoot: CONTENT_ROOT,
  snapshotRoot: SNAPSHOT_ROOT,
  outDir,
})

for (const issue of issues) console.error(formatIssue(issue))
if (manifest === null) {
  console.error(`\n${plural(issues.length, 'problem')}. Nothing was written.`)
  process.exit(1)
}

const bytes = manifest.packs.reduce((sum, p) => sum + p.bytes, 0)
const where = relative(process.cwd(), outDir) || '.'
console.log(
  `Built ${args.channel} release ${manifest.release}: ${plural(manifest.packs.length, 'pack')}, ` +
    `${(bytes / 1024).toFixed(1)} KiB, in ${where}. The snapshot is in japa-catalog/snapshot/.`,
)
