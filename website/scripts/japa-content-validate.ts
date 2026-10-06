// npm run japa:content:validate: checks japa-catalog/content/ and lists every problem.
// npm run test:unit runs the same check through files.unit.spec.ts.
import { CONTENT_ROOT, readContentTree } from '../src/japa/catalog-build/files'
import { formatIssue, plural } from '../src/japa/catalog-build/report'
import { validateContent } from '../src/japa/catalog-build/validate'

const { catalog, issues } = validateContent(readContentTree(CONTENT_ROOT))

for (const issue of issues) {
  console.error(formatIssue({ ...issue, file: `japa-catalog/content/${issue.file}` }))
}

if (issues.length > 0) {
  console.error(`\n${plural(issues.length, 'problem')} in japa-catalog/content/`)
  process.exit(1)
}

console.log(
  `japa-catalog/content/ is valid: ${[
    plural(catalog.traditions.length, 'tradition'),
    plural(catalog.deities.length, 'deity'),
    plural(catalog.practices.length, 'practice'),
    plural(catalog.programs.length, 'program'),
  ].join(', ')}`,
)
