# kit

Vibecoding project toolkit.

## Features

- Link AGENTS.md to CLAUDE.md
- Install shadcn/ui from online registry with aliases
- Project-level references for onboarding

## Install

```bash
bun add github:ethan-huo/kit
```

## Usage

```bash
# Initialize project
kit init

# Link AGENTS.md to CLAUDE.md in repo
bun kit link-claude

# Install shadcn/ui from online registry (requires config)
kit install-shadcn

```

## Configuration

Create `kit.config.ts` with shadcn config below.

## Non-interactive shadcn setup

Configure `kit.config.ts` to run without prompts:

```ts
import { defineConfig } from "kit/config"

export default defineConfig({
  shadcn: {
    installDependencies: true,
    iconLibrary: "lucide",
    tsconfigPath: "tsconfig.json",
    aliases: {
      components: "@/components",
      utils: "@/lib/utils",
      ui: "@/components/ui",
      style: "@/styles",
    },
  },
})
```

Run:

```bash
kit install-shadcn
```



## License

MIT
