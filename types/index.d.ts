export type Tokens = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export type TurnRow = Tokens & {
  model: string
  seconds: number
  isSubagent: boolean
}

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

export type Measure = {
  contextTokens?: number
  window: number
  percent?: number
  usd?: number
  limits: Limit[]
}

declare module 'claude-code' {
  interface PluginState {
    'token-dashboard': {
      main: Tokens
      subagents: Tokens
      turns: TurnRow[]
      measure: Measure | null
    }
  }
}
