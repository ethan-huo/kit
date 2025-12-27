import { parseJSONC } from 'confbox'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

type Tsconfig = {
	extends?: string
	compilerOptions?: {
		baseUrl?: string
		paths?: Record<string, string[]>
	}
}

export type TsconfigResolution = {
	dir: string
	baseUrl: string
	paths: Record<string, string[]>
}

const cache = new Map<string, TsconfigResolution>()

export async function loadTsconfig(
	tsconfigPath: string,
): Promise<TsconfigResolution> {
	const absolutePath = path.resolve(tsconfigPath)
	const cached = cache.get(absolutePath)
	if (cached) return cached

	const { config, dir } = await loadRawTsconfig(absolutePath)
	const baseUrl = config.compilerOptions?.baseUrl ?? '.'
	const paths = config.compilerOptions?.paths ?? {}

	const resolution: TsconfigResolution = {
		dir,
		baseUrl,
		paths,
	}

	cache.set(absolutePath, resolution)
	return resolution
}

export function resolveAliasPath(
	importPath: string,
	tsconfig: TsconfigResolution,
): string | null {
	const entries = Object.entries(tsconfig.paths)
	for (const [pattern, targets] of entries) {
		const match = matchAliasPattern(importPath, pattern)
		if (!match) continue
		const target = targets?.[0]
		if (!target) continue
		const resolvedTarget = applyAliasTarget(target, match)
		const baseDir = path.resolve(tsconfig.dir, tsconfig.baseUrl || '.')
		return path.resolve(baseDir, resolvedTarget)
	}
	return null
}

function matchAliasPattern(
	importPath: string,
	pattern: string,
): { wildcard?: string } | null {
	if (!pattern.includes('*')) {
		return importPath === pattern ? {} : null
	}

	const [prefix = '', suffix = ''] = pattern.split('*')
	if (!importPath.startsWith(prefix) || !importPath.endsWith(suffix)) {
		return null
	}

	const wildcard = importPath.slice(
		prefix.length,
		importPath.length - suffix.length,
	)
	return { wildcard }
}

function applyAliasTarget(target: string, match: { wildcard?: string }) {
	if (!target.includes('*')) {
		return target
	}
	return target.replace('*', match.wildcard ?? '')
}

function resolveExtends(extendsValue: string, baseDir: string): string | null {
	if (extendsValue.startsWith('.')) {
		return path.resolve(baseDir, extendsValue)
	}
	if (path.isAbsolute(extendsValue)) {
		return extendsValue
	}
	const require = createRequire(import.meta.url)
	try {
		return require.resolve(extendsValue, { paths: [baseDir] })
	} catch {
		return null
	}
}

function mergeTsconfig(
	base: Tsconfig | undefined,
	current: Tsconfig,
): Tsconfig {
	if (!base) return current

	return {
		...base,
		...current,
		compilerOptions: {
			...base.compilerOptions,
			...current.compilerOptions,
			paths: {
				...(base.compilerOptions?.paths ?? {}),
				...(current.compilerOptions?.paths ?? {}),
			},
		},
	}
}

async function loadRawTsconfig(
	absolutePath: string,
): Promise<{ config: Tsconfig; dir: string }> {
	const raw = await readFile(absolutePath, 'utf8')
	const parsed = parseJSONC(raw) as Tsconfig
	const tsconfigDir = path.dirname(absolutePath)

	if (!parsed.extends) {
		return { config: parsed, dir: tsconfigDir }
	}

	const extendsPath = resolveExtends(parsed.extends, tsconfigDir)
	if (!extendsPath) {
		return { config: parsed, dir: tsconfigDir }
	}

	const base = await loadRawTsconfig(extendsPath)
	return {
		config: mergeTsconfig(base.config, parsed),
		dir: tsconfigDir,
	}
}
