import { Command } from "commander"
import { c } from "../utils/color"

const DEFAULT_CONFIG = `import { defineConfig } from 'agent-tool/config'

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
`

export const initCommand = new Command('init')
  .description('Initialize agent-tool in the current project')
  .option('-f, --force', 'overwrite existing config', false)
  .action(async (options) => {
    const configPath = 'agent.config.ts'
    const file = Bun.file(configPath)
    const exists = await file.exists()

    if (exists && !options.force) {
      console.log(c.warn(`Config already exists: ${configPath}`))
      console.log(c.info("Use --force to overwrite."))
      return
    }

    await Bun.write(configPath, DEFAULT_CONFIG)

    console.log(c.success("Initialized agent-tool config."))
  })
