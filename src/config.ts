import * as v from 'valibot'

import { ICON_LIBRARY_VALUE_LIST } from './utils/shadcn-data'

const configEntrySchema = v.object({
	shadcn: v.optional(
		v.object({
			installDependencies: v.optional(v.boolean(), true),
			iconLibrary: v.optional(v.picklist(ICON_LIBRARY_VALUE_LIST), 'lucide'),
			tsconfigPath: v.string(),
			aliases: v.object({
				ui: v.optional(v.string(), '@/components/ui'),
				utils: v.optional(v.string(), '@/lib/utils'),
				style: v.optional(v.string(), '@/styles'),
				components: v.optional(v.string(), '@/components'),
			}),
		}),
	),
})

const configSchema = v.union([configEntrySchema, v.array(configEntrySchema)])

export type ConfigInput = v.InferInput<typeof configSchema>
export type ConfigOutput = v.InferOutput<typeof configSchema>
export type ConfigEntry = v.InferOutput<typeof configEntrySchema>

export function defineConfig(config: ConfigInput): ConfigOutput {
	return v.parse(configSchema, config)
}

export async function loadConfig(configPath?: string): Promise<ConfigOutput> {
	const path = configPath ?? 'kit.config.ts'
	const absolutePath = Bun.pathToFileURL(
		path.startsWith('/') ? path : `${process.cwd()}/${path}`,
	).href

	try {
		const mod = await import(absolutePath)
		const config = mod.default ?? mod
		return v.parse(configSchema, config)
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
			return v.parse(configSchema, {})
		}
		throw error
	}
}
