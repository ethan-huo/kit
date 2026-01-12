import { fmt } from 'argc/terminal'
import { mkdir, cp, readdir } from 'node:fs/promises'
import path from 'node:path'

import type { AppHandlers } from '../cli'

import { loadConfig, type ShadcnEntry } from '../config'
import { ICON_LIBRARIES } from '../utils/shadcn-data'
import { installShadcnAll } from '../utils/shadcn-install'
import { loadTsconfig, resolveAliasPath } from '../utils/tsconfig'

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '../..')

type ShadcnEntryWithIndex = {
	index: number
	shadcn: ShadcnEntry
}

export const runInstallShadcn: AppHandlers['install-shadcn'] = async ({
	input,
	context,
}) => {
	const { install: shouldInstall, config: configPath } = input
	const { workdir } = context
	const config = await loadConfig(path.join(workdir, configPath))
	const shadcnEntries: ShadcnEntryWithIndex[] = (config.shadcn ?? []).map(
		(entry, index) => ({
			index,
			shadcn: entry,
		}),
	)
	if (!shadcnEntries.length) {
		console.log(
			fmt.error(
				'Missing shadcn config. Add entries under shadcn in kit.config.ts.',
			),
		)
		return
	}

	const base = 'base'
	const style = 'vega'

	console.log('')
	console.log(fmt.info('Installing shadcn/ui...'))
	console.log('')

	const deps = new Set<string>()
	const devDeps = new Set<string>()
	const shouldInstallDeps =
		shouldInstall &&
		shadcnEntries.some((entry) => entry.shadcn.installDependencies !== false)

	for (const { index, shadcn } of shadcnEntries) {
		const configShadcn = shadcn
		const { iconLibrary, aliases, tsconfigPath } = configShadcn

		if (!iconLibrary || !tsconfigPath) {
			console.log(
				fmt.error(
					`Missing shadcn config values in entry ${index + 1}. Ensure iconLibrary/tsconfigPath are set.`,
				),
			)
			return
		}

		if (shadcnEntries.length > 1) {
			console.log(
				fmt.info(
					`Config ${index + 1}/${shadcnEntries.length}: ${tsconfigPath}`,
				),
			)
		}

		const resolveConfigPath = (value: string) =>
			path.isAbsolute(value) ? value : path.resolve(workdir, value)
		const tsconfigAbsolute = resolveConfigPath(tsconfigPath)
		const tsconfig = await loadTsconfig(tsconfigAbsolute)
		const resolvePath = (value: string, fallbackExt?: string) => {
			const trimmed = value.trim()
			let resolved: string

			if (path.isAbsolute(trimmed)) {
				resolved = trimmed
			} else if (trimmed.startsWith('.')) {
				resolved = path.resolve(workdir, trimmed)
			} else {
				const aliasResolved = resolveAliasPath(trimmed, tsconfig)
				if (aliasResolved) {
					resolved = aliasResolved
				} else {
					if (trimmed.startsWith('@') || trimmed.startsWith('~')) {
						throw new Error(`Unable to resolve alias path: ${trimmed}`)
					}
					resolved = path.resolve(workdir, trimmed)
				}
			}

			if (fallbackExt && !path.extname(resolved)) {
				return `${resolved}${fallbackExt}`
			}
			return resolved
		}

		const examplePath = aliases.components
			? resolvePath(`${aliases.components}/example`, '.tsx')
			: undefined

		const result = await installShadcnAll(
			{ base, style, iconLibrary },
			{
				uiDir: resolvePath(aliases.ui),
				utilsPath: resolvePath(aliases.utils, '.ts'),
				examplePath,
			},
			aliases,
		)

		console.log(fmt.success(`Components copied: ${result.components}`))
		console.log(fmt.info(`UI dir: ${path.relative(process.cwd(), result.uiDir)}`))
		console.log(
			fmt.info(`Utils file: ${path.relative(process.cwd(), result.utilsPath)}`),
		)
		console.log(fmt.info(`Style class: style-${style}`))

		if (aliases.style) {
			const themesSource = path.join(PACKAGE_ROOT, 'assets/themes')
			const stylesTarget = resolvePath(aliases.style)
			await mkdir(stylesTarget, { recursive: true })
			const themeFiles = await readdir(themesSource)
			for (const file of themeFiles) {
				await cp(path.join(themesSource, file), path.join(stylesTarget, file), {
					force: true,
				})
			}
			console.log(
				fmt.success(
					`Themes copied: ${themeFiles.length} (${path.relative(
						process.cwd(),
						stylesTarget,
					)})`,
				),
			)
		}

		if (aliases.components) {
			const componentsSource = path.join(PACKAGE_ROOT, 'assets/components')
			const componentsTarget = resolvePath(aliases.components)
			await mkdir(componentsTarget, { recursive: true })
			const componentFiles = await readdir(componentsSource)
			for (const file of componentFiles) {
				await cp(
					path.join(componentsSource, file),
					path.join(componentsTarget, file),
					{ force: true },
				)
			}
			console.log(
				fmt.success(
					`Components helpers copied: ${componentFiles.length} (${path.relative(
						process.cwd(),
						componentsTarget,
					)})`,
				),
			)
		}

		const referencePath = path.join(workdir, 'references', 'base-ui.md')
		const referenceFile = Bun.file(referencePath)
		if (!(await referenceFile.exists())) {
			console.log(fmt.info('Writing Base UI references...'))
			await mkdir(path.dirname(referencePath), { recursive: true })
			const response = await fetch('https://base-ui.com/llms.txt')
			if (!response.ok) {
				throw new Error(
					`Failed to fetch https://base-ui.com/llms.txt: ${response.status}`,
				)
			}
			await Bun.write(referencePath, await response.text())
			console.log(
				fmt.success(`References: ${path.relative(process.cwd(), referencePath)}`),
			)
		}
		if (result.examplePath) {
			console.log(
				fmt.info(
					`Example helper: ${path.relative(process.cwd(), result.examplePath)}`,
				),
			)
		}
		if (result.previewDir) {
			console.log(
				fmt.info(
					`Preview blocks: ${result.previewBlocks ?? 0} (${path.relative(
						process.cwd(),
						result.previewDir,
					)})`,
				),
			)
		}

		const iconDeps =
			ICON_LIBRARIES.find((lib) => lib.value === iconLibrary)?.packages ?? []
		for (const dependency of result.dependencies) {
			deps.add(dependency)
		}
		for (const dependency of iconDeps) {
			deps.add(dependency)
		}
		for (const dependency of result.devDependencies ?? []) {
			devDeps.add(dependency)
		}
	}

	if (!shouldInstallDeps) {
		console.log('')
		console.log(
			fmt.warn('Skipped dependency installation (config/--no-install).'),
		)
		if (deps.size) {
			console.log(fmt.info('Dependencies required:'))
			Array.from(deps).forEach((dependency) =>
				console.log(`- ${dependency}`),
			)
		}
		if (devDeps.size) {
			console.log(fmt.info('Dev dependencies required:'))
			Array.from(devDeps).forEach((dependency) =>
				console.log(`- ${dependency}`),
			)
		}
		return
	}

	if (deps.size) {
		const depList = Array.from(deps)
		console.log('')
		console.log(fmt.info('Installing dependencies with bun add...'))
		console.log('')
		await Bun.spawn({
			cmd: ['bun', 'add', ...depList],
			stdio: ['inherit', 'inherit', 'inherit'],
		}).exited
	}

	if (devDeps.size) {
		const depList = Array.from(devDeps)
		console.log('')
		console.log(fmt.info('Installing dev dependencies with bun add -d...'))
		console.log('')
		await Bun.spawn({
			cmd: ['bun', 'add', '-d', ...depList],
			stdio: ['inherit', 'inherit', 'inherit'],
		}).exited
	}
}
