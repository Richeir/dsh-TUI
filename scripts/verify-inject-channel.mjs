/**
 * Verification for the external injection channel (src/dsh-adapter/inject-channel.ts).
 *
 * Pure parsing (no socket):
 * - parseInjectMessage accepts prompt.append (with string text) and
 *   command.execute:prompt.submit, and rejects malformed lines (non-JSON,
 *   wrong type, missing/typed-wrong fields, unknown command) with null
 *
 * End-to-end over a real Unix socket (skipped on win32, which uses named pipes):
 * - openInjectChannel binds a per-session socket, writes a discovery record
 *   into servers.json with the right cwd, and dispatches newline-delimited
 *   messages: prompt.append → append(text), command.execute → submit()
 * - two messages in one write (split on the newline) both dispatch, in order
 * - close() removes this session's discovery record and unlinks the socket
 *
 * Uses a temp HOME so the real ~/.dsh-tui is never touched. The temp HOME comes
 * from a short root: Unix sockets bind through a 104-byte `sun_path` cap, and
 * macOS hands out a ~48-byte per-user TMPDIR (/var/folders/.../T), so
 * `mkdtempSync(tmpdir())` plus the real socket suffix overflows it and `listen`
 * fails with EINVAL. `/tmp` is tried first; if no writable short root exists,
 * the socket half is reported skipped instead of failing the gate for a reason
 * unrelated to injection.
 *
 * Run: node --import tsx/esm scripts/verify-inject-channel.mjs
 */
import { connect } from 'node:net'
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** Hard cap on a bindable Unix socket path (bytes of `sockaddr_un` `sun_path`). */
const SUN_PATH_LIMIT = 104

/** Session id for the socket e2e; short on purpose to leave path budget. */
const sessionId = 'inject-test-1'

/** Length the socket path would end up at for a candidate fake home, in bytes. */
function socketPathLength(home) {
  // The cap is on encoded bytes, not UTF-16 units: a non-ASCII home directory
  // costs more sun_path than it looks.
  return Buffer.byteLength(join(home, '.dsh-tui', 'inject', `${sessionId}.sock`), 'utf8')
}

/**
 * Create a fake home whose derived socket path is still bindable, preferring
 * roots that are already short.
 * @returns {{ home: string, overBudget: boolean }} fake home and whether every
 *   candidate root overflowed {@link SUN_PATH_LIMIT}.
 */
function makeTempHome() {
  const roots = []
  for (const root of ['/tmp', tmpdir()]) {
    if (roots.includes(root)) continue
    try {
      accessSync(root, constants.W_OK)
      roots.push(root)
    } catch {
      // Not usable as a temp root; the next candidate may be.
    }
  }
  for (const root of roots) {
    let home
    try {
      home = mkdtempSync(join(root, 'dsh-inj-'))
    } catch {
      continue
    }
    if (socketPathLength(home) <= SUN_PATH_LIMIT) return { home, overBudget: false }
    rmSync(home, { recursive: true, force: true })
  }
  // No short writable root: still hand the module a home so the pure-parse
  // checks run, and let the caller skip the socket half. Relative to cwd, and
  // pruned below once the run finishes.
  const fallback = join(process.cwd(), '.tmp', 'dsh-inject-unbindable')
  mkdirSync(dirname(fallback), { recursive: true })
  return { home: fallback, overBudget: true }
}

// Point DATA_DIR at a temp home BEFORE importing the module (paths.ts reads
// homedir at import time).
const { home: tmpHome, overBudget } = makeTempHome()
process.env.HOME = tmpHome
process.env.USERPROFILE = tmpHome

const mod = await import('../src/dsh-adapter/inject-channel.ts')
const { parseInjectMessage, openInjectChannel, socketPathFor, SERVERS_FILE } = mod

let failures = 0
function check(name, cond) {
  if (cond) {
    console.log(`  ok   ${name}`)
  } else {
    console.error(`  FAIL ${name}`)
    failures++
  }
}

console.log('parseInjectMessage:')
check('append with text', JSON.stringify(parseInjectMessage('{"type":"prompt.append","text":"@a.ts "}')) === JSON.stringify({ type: 'prompt.append', text: '@a.ts ' }))
check('submit command', JSON.stringify(parseInjectMessage('{"type":"command.execute","command":"prompt.submit"}')) === JSON.stringify({ type: 'command.execute', command: 'prompt.submit' }))
check('empty line → null', parseInjectMessage('') === null)
check('non-JSON → null', parseInjectMessage('not json') === null)
check('wrong type → null', parseInjectMessage('{"type":"nope"}') === null)
check('append without text → null', parseInjectMessage('{"type":"prompt.append"}') === null)
check('append non-string text → null', parseInjectMessage('{"type":"prompt.append","text":42}') === null)
check('unknown command → null', parseInjectMessage('{"type":"command.execute","command":"session.new"}') === null)

function cleanup() {
  try {
    rmSync(tmpHome, { recursive: true, force: true })
  } catch {
    // Best-effort: a leaked temp home must not change the gate verdict.
  }
}

if (process.platform === 'win32') {
  console.log('socket e2e: skipped on win32 (named pipes)')
  cleanup()
  process.exit(failures === 0 ? 0 : 1)
}

if (overBudget) {
  console.log(`socket e2e: skipped (no writable temp root short enough for a ${SUN_PATH_LIMIT}-byte sun_path)`)
  cleanup()
  process.exit(failures === 0 ? 0 : 1)
}

console.log('socket e2e:')
const cwd = '/tmp/project-x'
const appended = []
let submits = 0
const channel = openInjectChannel(
  sessionId,
  cwd,
  { append: (t) => appended.push(t), submit: () => { submits++ } },
  (m) => console.error('    channel error:', m),
)
check('openInjectChannel returned a channel', channel !== null)
check('socketPathFor matches channel path', channel?.socketPath === socketPathFor(sessionId))

// Discovery record written with our cwd.
const servers = JSON.parse(readFileSync(SERVERS_FILE, 'utf8'))
const record = servers.find((s) => s.sessionId === sessionId)
check('discovery record present', record !== undefined)
check('discovery record cwd correct', record?.cwd === cwd)
check('discovery record socketPath correct', record?.socketPath === channel?.socketPath)

// Connect and send two messages in one write.
await new Promise((resolve, reject) => {
  const client = connect(channel.socketPath, () => {
    client.write('{"type":"prompt.append","text":"@src/foo.ts "}\n{"type":"command.execute","command":"prompt.submit"}\n')
    client.end()
  })
  client.on('close', resolve)
  client.on('error', reject)
})

// Give the server loop a tick to dispatch.
await new Promise((r) => setTimeout(r, 100))
check('append received once', appended.length === 1)
check('append text correct', appended[0] === '@src/foo.ts ')
check('submit received once', submits === 1)

// close() cleans up.
channel.close()
await new Promise((r) => setTimeout(r, 50))
const after = existsSync(SERVERS_FILE) ? JSON.parse(readFileSync(SERVERS_FILE, 'utf8')) : []
check('discovery record removed after close', after.find((s) => s.sessionId === sessionId) === undefined)
check('socket file unlinked after close', !existsSync(channel.socketPath))

console.log(failures === 0 ? '\nAll injection-channel checks passed.' : `\n${failures} check(s) failed.`)
cleanup()
process.exit(failures === 0 ? 0 : 1)
