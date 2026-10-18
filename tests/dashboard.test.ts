import { describe, expect, test } from 'claude-code/testing'

import { bar, fmt, statusText } from '../hooks/register'

describe('token dashboard helpers', () => {
  test('formats token counts', async () => {
    expect(fmt(950)).toBe('950')
    expect(fmt(12_345)).toBe('12.3k')
    expect(fmt(2_500_000)).toBe('2.5M')
  })

  test('draws a bar clamped to its width', async () => {
    expect(bar(50, 10)).toBe('▰▰▰▰▰▱▱▱▱▱')
    expect(bar(150, 4)).toBe('▰▰▰▰')
  })

  test('status line shows context and cost', async () => {
    expect(statusText({ window: 200_000, percent: 42, usd: 1.234, limits: [] })).toBe('ctx 42% · $1.23')
    expect(statusText({ window: 200_000, limits: [] })).toBe('ctx —')
  })
})
