#!/usr/bin/env -S bun --no-env-file
import { cli } from 'argc'

import { runInit } from './commands/init'
import { runInstallShadcn } from './commands/install-shadcn'
import { runLinkClaude } from './commands/link-claude'
import { runSetupFmt } from './commands/setup-fmt'
import { schema } from './schema'
import { findWorkdir } from './utils/fs'

cli(schema, {
	name: 'kit',
	version: '0.1.0',
	description: 'Vibecoding project toolkit',
}).run({
	context: async () => {
		const workdir = (await findWorkdir()) ?? process.cwd()
		return { workdir }
	},
	handlers: {
		init: runInit,
		'link-claude': runLinkClaude,
		'install-shadcn': runInstallShadcn,
		'setup-fmt': runSetupFmt,
	},
})
