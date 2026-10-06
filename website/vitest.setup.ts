// Test settings take precedence: dotenv never overwrites a variable that is already set,
// so values from .env.test (or CI) win over the developer's .env.
import { config } from 'dotenv'

config({ path: '.env.test' })
config({ path: '.env' })
