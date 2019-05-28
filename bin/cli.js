#!/usr/bin/env node

const program = require('commander')
const { launch } = require('../src')
const { version } = require('../package.json')

program
  .command('extensions [<extDir>]')
  .usage('PATH_TO_EXTENSION --url https://treo.sh/')
  .version(version)
  .option('--url <url>', 'url to test extension', 'https://example.com/')
  .option('--json', 'output results in json format')
  .option('--browserType <type>', 'specify the type of browser')
  .action((dir = '', cmd) => {
    launch(dir, cmd)
      .catch(e => {
        console.error(e)
        process.exit(1)
      })
      .then(() => process.exit())
  })

program.parse(process.argv)
