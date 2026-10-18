import { atom, read, update } from 'claude-code'
import type { Register, RenderChildren } from 'claude-code'

import type { Measure, Tokens, TurnRow } from '../types'

const PANE = 'token-dashboard'
const TITLE = 'Tokens'
const ZERO: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const main = atom({ plugin: 'token-dashboard', key: 'main' } as const, ZERO)
const subagents = atom({ plugin: 'token-dashboard', key: 'subagents' } as const, ZERO)
const turns = atom({ plugin: 'token-dashboard', key: 'turns' } as const, [])
const measure = atom({ plugin: 'token-dashboard', key: 'measure' } as const, null)

export const fmt = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

export const bar = (percent: number, width: number): string => {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * width)
  return '▰'.repeat(filled) + '▱'.repeat(width - filled)
}

const tone = (percent: number) => (percent >= 85 ? 'error' : percent >= 60 ? 'warning' : 'success')

const add = (a: Tokens, b: Tokens): Tokens => ({
  input: a.input + b.input,
  output: a.output + b.output,
  cacheRead: a.cacheRead + b.cacheRead,
  cacheWrite: a.cacheWrite + b.cacheWrite,
})

export const statusText = (m: Measure): string => {
  const parts = [m.percent === undefined ? 'ctx —' : `ctx ${m.percent}%`]
  if (m.usd !== undefined) parts.push(`$${m.usd.toFixed(2)}`)
  return parts.join(' · ')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokens',
      description: 'Toggle the token dashboard pane',
    })
    if (e.isInteractive) void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'tokens' }, async $ => {
    const panes = await $.ui.panes()
    if (panes.some(p => p.id === PANE)) {
      await $.ui.close({ id: PANE })
      return { text: 'Token dashboard closed.' }
    }
    const opened = await $.ui.open({ id: PANE, title: TITLE })

    return { text: opened.isPlaced ? 'Token dashboard opened.' : `Token dashboard waiting: ${opened.reason}` }
  })

  on('session.measure', async ($, e, next) => {
    const m: Measure = {
      contextTokens: e.context.tokens,
      window: e.context.window,
      percent: e.context.percent,
      usd: e.cost?.usd,
      limits: e.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt })),
    }
    await update($, measure, () => m)
    $.ui.status(statusText(m))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (u) {
      const t: Tokens = {
        input: u.input_tokens,
        output: u.output_tokens,
        cacheRead: u.cache_read_input_tokens,
        cacheWrite: u.cache_creation_input_tokens,
      }
      const isSubagent = e.agentId !== undefined
      if (isSubagent) await update($, subagents, total => add(total, t))
      else await update($, main, total => add(total, t))
      const row: TurnRow = { ...t, model: u.model, seconds: Math.round(e.durationMs / 1000), isSubagent }
      await update($, turns, list => [...list, row].slice(-50))
    }

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, main, () => ZERO)
      await update($, subagents, () => ZERO)
      await update($, turns, () => [])
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const m = await read($, measure)
    const total = await read($, main)
    const sub = await read($, subagents)
    const list = await read($, turns)
    const cols = e.viewport?.columns ?? 40
    const rows = e.viewport?.rows ?? 24
    const inner = Math.max(16, cols - 4)
    const barWidth = Math.max(8, Math.min(40, inner - 6))
    const limits = m?.limits ?? []
    const room = Math.max(1, rows - 16 - (limits.length > 0 ? limits.length + 3 : 0) - 3)

    const Card = (props: { title: string; children?: RenderChildren }) => (
      <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1}>
        <Text bold color="claude">
          {props.title}
        </Text>
        {props.children}
      </Box>
    )

    const Row = (props: { label: string; cells: string[]; isHeader?: boolean }) => (
      <Box>
        <Box flexGrow={1}>
          <Text dimColor>{props.label}</Text>
        </Box>
        {props.cells.map(c => (
          <Box width={9} justifyContent="flex-end">
            <Text dimColor={props.isHeader} bold={props.isHeader}>
              {c}
            </Text>
          </Box>
        ))}
      </Box>
    )

    return (
      <Box flexDirection="column">
        <Card title="Context">
          {m?.percent === undefined ? (
            <Text dimColor>Waiting for the first response…</Text>
          ) : (
            <Box justifyContent="space-between">
              <Text color={tone(m.percent)}>{bar(m.percent, barWidth)}</Text>
              <Text bold color={tone(m.percent)}>
                {String(m.percent).padStart(3)}%
              </Text>
            </Box>
          )}
          <Text dimColor>
            {m?.contextTokens === undefined ? '—' : fmt(m.contextTokens)} of {m ? fmt(m.window) : '—'} tokens
          </Text>
        </Card>

        <Card title="Cost">
          <Box justifyContent="flex-end">
            <Text bold>{m?.usd === undefined ? '—' : `$${m.usd.toFixed(4)}`}</Text>
          </Box>
        </Card>

        <Card title="Tokens">
          <Row label="" cells={['main', 'agents']} isHeader />
          <Row label="input" cells={[fmt(total.input), fmt(sub.input)]} />
          <Row label="output" cells={[fmt(total.output), fmt(sub.output)]} />
          <Row label="cache rd" cells={[fmt(total.cacheRead), fmt(sub.cacheRead)]} />
          <Row label="cache wr" cells={[fmt(total.cacheWrite), fmt(sub.cacheWrite)]} />
        </Card>

        {limits.length > 0 && (
          <Card title="Rate limits">
            {limits.map(r => (
              <Box justifyContent="space-between">
                <Text dimColor>{r.kind.replace('_', ' ').padEnd(10)}</Text>
                <Text color={tone(r.percentUsed)}>{bar(r.percentUsed, Math.max(6, barWidth - 16))}</Text>
                <Text>{String(Math.round(r.percentUsed)).padStart(4)}%</Text>
              </Box>
            ))}
          </Card>
        )}

        <Card title="Recent turns">
          {list.length === 0 && <Text dimColor>None yet.</Text>}
          {list
            .slice(-room)
            .reverse()
            .map(t => (
              <Box justifyContent="space-between">
                <Text dimColor={t.isSubagent}>
                  {t.isSubagent ? '↳ agent ' : '● main  '}
                </Text>
                <Text dimColor={t.isSubagent}>
                  {fmt(t.input + t.cacheRead + t.cacheWrite).padStart(6)} in {fmt(t.output).padStart(6)} out {`${t.seconds}s`.padStart(5)}
                </Text>
              </Box>
            ))}
        </Card>
      </Box>
    )
  })
}
