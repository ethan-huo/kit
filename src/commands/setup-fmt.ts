import { fmt } from 'argc/terminal'
import path from 'node:path'

import type { AppHandlers } from '../schema'

const KIT_ROOT = import.meta.dirname + '/../..'

export const runSetupFmt: AppHandlers['setup-fmt'] = async ({
	input,
	context,
}) => {
	const { force } = input
	const { workdir } = context

	// Copy .oxfmtrc.json from kit root
	const configPath = path.join(workdir, '.oxfmtrc.json')
	const configFile = Bun.file(configPath)
	const configExists = await configFile.exists()

	if (configExists && !force) {
		console.log(fmt.warn(`Config already exists: .oxfmtrc.json`))
		console.log(fmt.info('Use --force to overwrite.'))
	} else {
		const source = Bun.file(`${KIT_ROOT}/.oxfmtrc.json`)
		await Bun.write(configPath, source)
		console.log(fmt.success(`Created .oxfmtrc.json`))
	}

	// Update package.json
	const pkgPath = path.join(workdir, 'package.json')
	const pkgFile = Bun.file(pkgPath)
	const pkgExists = await pkgFile.exists()

	if (!pkgExists) {
		console.log(fmt.warn('package.json not found'))
		return
	}

	const pkg = await pkgFile.json()
	pkg.scripts = pkg.scripts || {}

	if (pkg.scripts.fmt && !force) {
		console.log(fmt.warn('Script "fmt" already exists in package.json'))
		console.log(fmt.info('Use --force to overwrite.'))
	} else {
		pkg.scripts.fmt = 'bunx oxfmt .'
		await Bun.write(pkgPath, JSON.stringify(pkg, null, '\t') + '\n')
		console.log(fmt.success('Added "fmt" script to package.json'))
	}
}
