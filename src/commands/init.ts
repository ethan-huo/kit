import { Command } from "commander"
import { c } from "../utils/color"

const DEFAULT_CONFIG = `import { defineConfig } from 'kit/config'

export default defineConfig({
  shadcn: {
    installDependencies: true,
    base: "base",
    style: "vega",
    iconLibrary: "lucide",
    tsconfigPath: "tsconfig.json",
    aliases: {
      ui: "@/components/ui",
      utils: "@/lib/utils",
      styles: "@/styles",
      components: "@/components",
      hooks: "@/components/hooks",
      lib: "@/lib",
    },
  },
})
`

export const initCommand = new Command('init')
  .description('Initialize kit in the current project')
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

    console.log(c.success("Initialized kit config."))
  })
