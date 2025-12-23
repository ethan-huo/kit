# agent-tool

CLI toolkit for coding agents.

## Features

- Link AGENTS.md to CLAUDE.md
- Install shadcn/ui from online registry with aliases
- Project-level references for onboarding

## Install

```bash
bun add github:ethan-huo/agent-tool
```

## Usage

```bash
# Initialize project
agent-tool init

# Link AGENTS.md to CLAUDE.md in repo
bun agent link-claude

# Install shadcn/ui from online registry (requires config)
agent-tool install-shadcn
# or
bun agent install-shadcn

```

## Configuration

Create `agent.config.ts` with shadcn config below.

## Non-interactive shadcn setup

Configure `agent.config.ts` to run without prompts:

```ts
import { defineConfig } from "agent-tool/config"

export default defineConfig({
  shadcn: {
    installDependencies: true,
    base: "base",
    style: "vega",
    baseColor: "neutral",
    theme: "neutral",
    iconLibrary: "lucide",
    font: "inter",
    menuAccent: "subtle",
    menuColor: "default",
    radius: "default",
    tsconfigPath: "tsconfig.json",
    aliases: {
      components: "@/components",
      hooks: "@/components/hooks",
      utils: "@/lib/utils",
      ui: "@/components/ui",
      style: "@/styles/default.css",
      lib: "@/lib",
    },
  },
})
```

Run:

```bash
agent-tool install-shadcn
```



## License

MIT
