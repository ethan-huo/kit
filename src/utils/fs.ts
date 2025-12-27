import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'

export async function ensureDir(dir: string): Promise<void> {
	try {
		const info = await stat(dir)
		if (!info.isDirectory()) {
			throw new Error(`Path exists and is not a directory: ${dir}`)
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error
		}
		await mkdir(dir, { recursive: true })
	}
}

export async function findWorkdir(
	startDir: string = process.cwd(),
): Promise<string | null> {
	let dir = path.resolve(startDir)
	const root = path.parse(dir).root

	while (dir !== root) {
		const configPath = path.join(dir, 'kit.config.ts')
		const file = Bun.file(configPath)
		if (await file.exists()) {
			return dir
		}
		dir = path.dirname(dir)
	}

	return null
}
