#!/usr/bin/env -S bun --no-env-file
import { cli } from 'argc'

import { runInit } from './commands/init'
import { runInstallShadcn } from './commands/install-shadcn'
import { runLinkClaude } from './commands/link-claude'
import { runSetupFmt } from './commands/setup-fmt'
import { schema } from './schema'
import { findWorkdir } from './utils/fs'

export const app = cli(schema, {
	name: 'kit',
	version: '0.1.0',
	description: 'Vibecoding project toolkit',
	context: async () => {
		const workdir = (await findWorkdir()) ?? process.cwd()
		return { workdir }
	},
})

// Handler types inferred from app (includes context)
export type AppHandlers = typeof app.Handlers

app.run({
	handlers: {
		init: runInit,
		'link-claude': runLinkClaude,
		'install-shadcn': runInstallShadcn,
		'setup-fmt': runSetupFmt,
	},
})
