# kit

Vibecoding project toolkit.

## Architecture

```
src/
├── cli.ts              # Commander.js entry, registers commands
├── config.ts           # Config schema and loader
├── commands/
│   ├── init.ts         # Project init: creates kit.config.ts
│   ├── config.ts       # Prints effective config
│   ├── serve.ts        # Starts local service (placeholder)
│   └── install-shadcn.ts # Installs shadcn/ui from local repo
└── utils/
    ├── fs.ts           # Small filesystem helpers
    ├── shadcn-data.ts  # shadcn/ui registry data loaders
    └── shadcn-install.ts # shadcn/ui installer
```

## Dev Commands

```bash
bun run src/cli.ts <command>  # Run locally
```

## Code Conventions

- No barrel files (index.ts)
- `type` over `interface`
- kebab-case file names
- Direct imports, no re-exports
