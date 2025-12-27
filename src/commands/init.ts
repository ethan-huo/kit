import { fmt } from 'argc/terminal'

import type { AppHandlers } from '../cli'

const DEFAULT_CONFIG = `import { defineConfig } from 'kit/config'

export default defineConfig({
  shadcn: {
    installDependencies: true,
    iconLibrary: "lucide",
    tsconfigPath: "tsconfig.json",
    aliases: {
      ui: "@/components/ui",
      utils: "@/lib/utils",
      style: "@/styles",
      components: "@/components",
    },
  },
})
`

export const runInit: AppHandlers['init'] = async ({ input }) => {
	const { force } = input
	const configPath = 'kit.config.ts'
	const file = Bun.file(configPath)
	const exists = await file.exists()

	if (exists && !force) {
		console.log(fmt.warn(`Config already exists: ${configPath}`))
		console.log(fmt.info('Use --force to overwrite.'))
		return
	}

	await Bun.write(configPath, DEFAULT_CONFIG)

	console.log(fmt.success('Initialized kit config.'))
}
