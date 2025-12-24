#!/usr/bin/env -S bun --no-env-file
import { Command } from 'commander'
import { initCommand } from './commands/init'
import { linkClaudeCommand } from './commands/link-claude'
import { installShadcnCommand } from './commands/install-shadcn'

const program = new Command()

program
  .name('kit')
  .description('Vibecoding project toolkit')
  .version('0.1.0')
  .option('-c, --config <path>', 'config file path', 'kit.config.ts')

program.addCommand(initCommand)
program.addCommand(linkClaudeCommand)
program.addCommand(installShadcnCommand)

program.parse()
