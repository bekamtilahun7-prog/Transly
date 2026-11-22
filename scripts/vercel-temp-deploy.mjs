import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    out[t.slice(0, i)] = t.slice(i + 1).trim()
  }
  return out
}

const client = loadEnv(join(root, 'client/.env'))
const server = loadEnv(join(root, 'server/.env'))

const runtime = {
  SUPABASE_URL: client.VITE_SUPABASE_URL,
  GEMINI_API_KEY: server.GEMINI_API_KEY,
  GEMINI_MODEL: server.GEMINI_MODEL,
  GEMINI_TTS_MODEL: server.GEMINI_TTS_MODEL,
  GEMINI_TTS_FALLBACK_MODEL: server.GEMINI_TTS_FALLBACK_MODEL,
  GEMINI_MOCK: 'false',
}

const args = ['--yes', 'vercel', 'deploy', '--temporary', '--yes']
for (const [key, value] of Object.entries(runtime)) {
  if (value) args.push('--env', `${key}=${value}`)
}

const system32 = 'C:\\Windows\\System32'
const pathEnv = `${system32};C:\\Windows;${process.env.Path || process.env.PATH || ''}`
const env = {
  ...process.env,
  ComSpec: `${system32}\\cmd.exe`,
  PATH: pathEnv,
  Path: pathEnv,
}

console.log('Starting Vercel temporary production deploy (env values not printed)')
const child = spawn('npx', args, {
  cwd: root,
  stdio: 'inherit',
  shell: `${system32}\\cmd.exe`,
  env,
})
child.on('exit', (code) => process.exit(code ?? 1))
