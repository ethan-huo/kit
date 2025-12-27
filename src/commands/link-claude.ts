import { fmt } from 'argc/terminal'
import { lstat, readdir, readlink, symlink } from 'node:fs/promises'
import path from 'node:path'

import type { AppHandlers } from '../cli'

const MAX_DEPTH = 6
const CLAUDE_FILE = 'CLAUDE.md'
const AGENTS_FILE = 'AGENTS.md'

async function walkForClaudeFiles(
	dir: string,
	depth: number,
	out: string[],
): Promise<void> {
	if (depth > MAX_DEPTH) return
	const entries = await readdir(dir, { withFileTypes: true })

	await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				if (entry.name.startsWith('.')) return
				await walkForClaudeFiles(entryPath, depth + 1, out)
				return
			}
			if (entry.isFile() && entry.name === CLAUDE_FILE) {
				out.push(entryPath)
			}
		}),
	)
}

async function ensureAgentsLink(
	dir: string,
): Promise<'linked' | 'skipped' | 'conflict'> {
	const linkPath = path.join(dir, AGENTS_FILE)
	const target = CLAUDE_FILE

	try {
		const info = await lstat(linkPath)
		if (info.isSymbolicLink()) {
			const existing = await readlink(linkPath)
			if (existing === target || path.normalize(existing) === target) {
				return 'skipped'
			}
			return 'conflict'
		}
		return 'conflict'
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error
		}
	}

	await symlink(target, linkPath)
	return 'linked'
}

export const runLinkClaude: AppHandlers['link-claude'] = async ({ context }) => {
	const { workdir } = context
	const claudeFiles: string[] = []

	await walkForClaudeFiles(workdir, 0, claudeFiles)

	let linked = 0
	let skipped = 0
	let conflicts = 0

	for (const claudeFile of claudeFiles) {
		const dir = path.dirname(claudeFile)
		const result = await ensureAgentsLink(dir)
		const claudeRel = path.relative(workdir, claudeFile) || CLAUDE_FILE
		const agentsRel =
			path.relative(workdir, path.join(dir, AGENTS_FILE)) || AGENTS_FILE

		if (result === 'linked') {
			linked += 1
			console.log(fmt.success(`${claudeRel} -> ${agentsRel}`))
		} else if (result === 'skipped') {
			skipped += 1
			console.log(fmt.warn(`${claudeRel} -> skipped, ${AGENTS_FILE} exists`))
		} else {
			conflicts += 1
			console.log(fmt.error(`${claudeRel} -> conflict, ${AGENTS_FILE} exists`))
		}
	}

	console.log('')
	console.log(fmt.info(`Found ${claudeFiles.length} CLAUDE.md files.`))
	console.log(fmt.success(`Linked ${linked} AGENTS.md symlinks.`))
	console.log(fmt.warn(`Skipped ${skipped} (already linked).`))
	if (conflicts > 0) {
		console.log(fmt.error(`Conflicts ${conflicts} (manual review needed).`))
	}
}
