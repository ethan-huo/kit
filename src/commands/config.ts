import { Command } from 'commander'
import { loadConfig } from '../config'

export const configCommand = new Command('config')
  .description('Print effective configuration')
  .action(async () => {
    const config = await loadConfig()
    console.log(JSON.stringify(config, null, 2))
  })
