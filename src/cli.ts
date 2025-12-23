#!/usr/bin/env -S bun --no-env-file
import { Command } from 'commander'
import { initCommand } from './commands/init'
import { configCommand } from './commands/config'
import { linkClaudeCommand } from './commands/link-claude'
import { installShadcnCommand } from './commands/install-shadcn'

const program = new Command()

program
  .name('agent-tool')
  .description('Coding agent service toolkit')
  .version('0.1.0')
  .option('-c, --config <path>', 'config file path', 'agent.config.ts')

program.addCommand(initCommand)
program.addCommand(configCommand)
program.addCommand(linkClaudeCommand)
program.addCommand(installShadcnCommand)

program.parse()
