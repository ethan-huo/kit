import { $ } from 'bun'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import type { AppHandlers } from '../cli'

async function notify(title: string, message: string): Promise<void> {
	console.log(`🔊 ${title}: ${message}`)
	await Promise.all([
		$`osascript -e ${"display notification \"" + message + "\" with title \"" + title + "\" sound name \"Glass\""}`.quiet(),
		$`say -v Samantha ${message}`.quiet(),
	])
}

async function getLatestRunId(projectDir: string): Promise<string | null> {
	try {
		const result =
			await $`gh run list --limit 1 --json databaseId --jq '.[0].databaseId'`
				.cwd(projectDir)
				.quiet()
		const runId = result.text().trim()
		return runId || null
	} catch (error) {
		console.error('Failed to get latest run:', error)
		return null
	}
}

async function getRunInfo(
	projectDir: string,
	runId: string,
): Promise<{ name: string; conclusion: string | null; status: string } | null> {
	try {
		const result =
			await $`gh run view ${runId} --json name,conclusion,status --jq '{name: .name, conclusion: .conclusion, status: .status}'`
				.cwd(projectDir)
				.quiet()
		return JSON.parse(result.text())
	} catch (error) {
		console.error('Failed to get run info:', error)
		return null
	}
}

function killPreviousWatcher(pidFile: string): void {
	if (!existsSync(pidFile)) {
		return
	}

	try {
		const oldPid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10)
		if (oldPid && !isNaN(oldPid)) {
			console.log(`🔪 Killing previous watcher process (PID: ${oldPid})`)
			try {
				process.kill(oldPid, 'SIGTERM')
			} catch (e: any) {
				if (e.code !== 'ESRCH') {
					console.error('Error killing previous process:', e)
				}
			}
		}
		unlinkSync(pidFile)
	} catch (error) {
		console.error('Error handling previous PID file:', error)
	}
}

function savePid(pidFile: string): void {
	writeFileSync(pidFile, process.pid.toString(), 'utf-8')
	console.log(`📝 Saved PID ${process.pid} to ${pidFile}`)
}

function cleanup(pidFile: string): void {
	if (existsSync(pidFile)) {
		try {
			const savedPid = parseInt(readFileSync(pidFile, 'utf-8').trim(), 10)
			if (savedPid === process.pid) {
				unlinkSync(pidFile)
			}
		} catch {
			// Ignore cleanup errors
		}
	}
}

async function watchRun(
	projectDir: string,
	runId: string,
): Promise<'success' | 'failure' | 'cancelled'> {
	console.log(`👀 Watching run ${runId}...`)

	try {
		await $`gh run watch ${runId} --exit-status`.cwd(projectDir).quiet()
		return 'success'
	} catch {
		const info = await getRunInfo(projectDir, runId)
		if (info?.conclusion === 'cancelled') {
			return 'cancelled'
		}
		return 'failure'
	}
}

export const runCiWatch: AppHandlers['ci.watch'] = async ({ context }) => {
	if (process.platform !== 'darwin') {
		return
	}

	const { workdir } = context
	const projectName = basename(workdir)
	const pidFile = join(tmpdir(), `ci-watch-${projectName}.pid`)

	console.log(`🚀 CI Watcher starting for project: ${projectName}`)

	killPreviousWatcher(pidFile)
	savePid(pidFile)

	const doCleanup = () => cleanup(pidFile)

	process.on('exit', doCleanup)
	process.on('SIGTERM', () => {
		doCleanup()
		process.exit(0)
	})
	process.on('SIGINT', () => {
		doCleanup()
		process.exit(0)
	})

	console.log('⏳ Waiting for CI to start...')
	await Bun.sleep(3000)

	const runId = await getLatestRunId(workdir)
	if (!runId) {
		await notify('GitHub Actions', 'Failed to find CI run')
		doCleanup()
		return
	}

	const runInfo = await getRunInfo(workdir, runId)
	const workflowName = runInfo?.name || 'CI'

	console.log(`📋 Found run: ${workflowName} (${runId})`)

	if (runInfo?.status === 'completed') {
		const conclusion = runInfo.conclusion || 'unknown'
		if (conclusion === 'success') {
			await notify(workflowName, 'Already completed successfully ✅')
		} else if (conclusion === 'cancelled') {
			await notify(workflowName, 'Was cancelled ⚪')
		} else {
			await notify(workflowName, 'Already failed ❌')
		}
		doCleanup()
		return
	}

	const result = await watchRun(workdir, runId)

	switch (result) {
		case 'success':
			await notify(workflowName, 'Completed successfully ✅')
			break
		case 'cancelled':
			await notify(workflowName, 'Was cancelled ⚪')
			break
		case 'failure':
			await notify(workflowName, 'Failed ❌')
			break
	}

	doCleanup()
}
