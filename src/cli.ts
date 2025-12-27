#!/usr/bin/env -S bun --no-env-file
import { cli } from 'argc'

import { runInit } from './commands/init'
import { runInstallShadcn } from './commands/install-shadcn'
import { runLinkClaude } from './commands/link-claude'
import { schema } from './schema'

cli(schema, {
	name: 'kit',
	version: '0.1.0',
	description: 'Vibecoding project toolkit',
}).run({
	handlers: {
		init: runInit,
		'link-claude': runLinkClaude,
		'install-shadcn': runInstallShadcn,
	},
})
