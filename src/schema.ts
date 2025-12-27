import { toStandardJsonSchema } from '@valibot/to-json-schema'
import { c, group } from 'argc'
import * as v from 'valibot'

const s = toStandardJsonSchema

export const schema = {
	init: c.meta({ description: 'Initialize kit in the current project' }).input(
		s(
			v.object({
				force: v.optional(v.boolean(), false),
			}),
		),
	),

	g: group(
		{ description: '' },
		{
			cc: c.meta({ description: 'Create Claude memory files' }),
		},
	),

	'link-claude': c
		.meta({ description: 'Link AGENTS.md to CLAUDE.md in repo folders' })
		.input(s(v.object({}))),

	'install-shadcn': c
		.meta({ description: 'Install shadcn/ui components from online registry' })
		.input(
			s(
				v.object({
					install: v.optional(v.boolean(), true),
					config: v.optional(v.string(), 'kit.config.ts'),
				}),
			),
		),

	'setup-fmt': c
		.meta({ description: 'Setup oxfmt formatter in the current project' })
		.input(
			s(
				v.object({
					force: v.optional(v.boolean(), false),
				}),
			),
		),
}

