import { fmt } from 'argc/terminal'
import { mkdir, cp, readdir } from 'node:fs/promises'
import path from 'node:path'

import type { AppHandlers } from '../schema'

import { loadConfig } from '../config'
import { ICON_LIBRARIES } from '../utils/shadcn-data'
import { installShadcnAll } from '../utils/shadcn-install'
import { loadTsconfig, resolveAliasPath } from '../utils/tsconfig'

const PACKAGE_ROOT = path.resolve(import.meta.dirname, '../..')

export const runInstallShadcn: AppHandlers['install-shadcn'] = async ({
	input,
	context,
}) => {
	const { install: shouldInstall, config: configPath } = input
	const { workdir } = context
	const config = await loadConfig(path.join(workdir, configPath))
	const configShadcn = config.shadcn
	if (!configShadcn) {
		fmt.error('Missing shadcn config. Add shadcn settings to kit.config.ts.')
		return
	}

	const { iconLibrary, aliases, tsconfigPath } = configShadcn

	if (!iconLibrary || !tsconfigPath) {
		fmt.error(
			'Missing shadcn config values. Ensure iconLibrary/tsconfigPath are set.',
		)
		return
	}
	const base = 'base'
	const style = 'vega'

	console.log('')
	console.log(fmt.info('Installing shadcn/ui...'))
	console.log('')

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
	const deps = new Set<string>([...result.dependencies, ...iconDeps])
	const devDeps = new Set<string>(result.devDependencies ?? [])

	if (!shouldInstall || configShadcn.installDependencies === false) {
		console.log('')
		console.log(
			fmt.warn('Skipped dependency installation (config/--no-install).'),
		)
		console.log(fmt.info('Dependencies required:'))
		Array.from(deps).forEach((dep) => console.log(`- ${dep}`))
		if (devDeps.size) {
			console.log(fmt.info('Dev dependencies required:'))
			Array.from(devDeps).forEach((dep) => console.log(`- ${dep}`))
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
