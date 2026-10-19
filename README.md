# Token dashboard for Claude Code

A Claude Code mod that adds a live **Tokens** pane and a status line entry to the terminal:

- **Context**: how full the context window is, with a bar that turns yellow at 60% and red at 85%
- **Cost**: what the session has cost so far, in US dollars
- **Tokens**: input, output, cache-read and cache-write totals, split into the main conversation and subagents
- **Rate limits**: your 5-hour and 7-day windows, on plans that report them
- **Recent turns**: tokens in and out and the duration of each turn

The status line shows `ctx 42% · $1.23`. Run `/tokens` to open or close the pane.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install token-dashboard --marketplace Gareth-Vassallo/token-claude-mod
```

Answer `y` to add the marketplace, then press Enter to pick the user scope.

From a shell:

```
claude plugin install token-dashboard --marketplace Gareth-Vassallo/token-claude-mod
```
