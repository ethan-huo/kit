# kit

Vibecoding project toolkit - CLI for quickly scaffolding project capabilities, Claude memory/skills, and development tooling.

## Overview

kit is a personal CLI tool distributed via GitHub, designed to accelerate project setup with opinionated defaults. It provides commands to:

- Initialize project configuration
- Install UI components (shadcn/ui)
- Setup code formatting (oxfmt)
- Manage Claude AI memory files (CLAUDE.md ↔ AGENTS.md linking)

## Architecture

```
src/
├── cli.ts              # argc-based CLI entry, registers commands
├── schema.ts           # Command schemas with valibot validation
├── config.ts           # Config schema and loader
├── commands/
│   ├── init.ts         # Creates kit.config.ts
│   ├── install-shadcn.ts # Installs shadcn/ui from online registry
│   ├── link-claude.ts  # Symlinks AGENTS.md → CLAUDE.md in repos
│   └── setup-fmt.ts    # Copies .oxfmtrc.json and adds fmt script
└── utils/
    ├── fs.ts           # Filesystem helpers
    ├── tsconfig.ts     # tsconfig.json utilities
    ├── shadcn-data.ts  # shadcn/ui registry data loaders
    └── shadcn-install.ts # shadcn/ui installer
```

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize kit config (kit.config.ts) |
| `install-shadcn` | Install shadcn/ui components |
| `link-claude` | Create AGENTS.md symlinks to CLAUDE.md files |
| `setup-fmt` | Setup oxfmt formatter (.oxfmtrc.json + package.json script) |

## Dev Commands

```bash
bun run src/cli.ts <command>  # Run locally
bun run src/cli.ts --help     # Show available commands
```

## Code Conventions

- No barrel files (index.ts)
- `type` over `interface`
- kebab-case file names
- Direct imports, no re-exports
- Parameter destructuring inside function body, not in signature
- Use `argc` for CLI parsing with `valibot` schemas
