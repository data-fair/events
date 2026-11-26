import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The last lines of the dev API's output: the file `npm run dev` (and CI) writes it to, `<prefix>api.log` in
 * DEV_LOG_DIR (default `dev/logs`, no prefix). Empty when there is none.
 */
export const apiLogs = (lines = 200): string => {
  const file = join(process.env.DEV_LOG_DIR || 'dev/logs', `${process.env.DEV_LOG_PREFIX ?? ''}api.log`)
  if (!existsSync(file)) return ''
  return readFileSync(file, 'utf8').split('\n').slice(-lines).join('\n')
}
