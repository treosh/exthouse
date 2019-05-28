#!/usr/bin/env node

const program = require('commander')
const { launch } = require('../src')
const { browsers } = require('../src/settings')
const { version } = require('../package.json')

program
  .command('ext-perf [<extDir>]')
  .usage('EXTENSION_DIR --url https://treo.sh/')
  .version(version)
  .option('--url <url>', 'url to test extension', 'https://example.com/')
  .option('--json', 'output results in json format')
  .option('--browserType <type>', 'specify the type of browser', browsers.CHROME)
  .action((dir = '', cmd) => {
    launch(dir, cmd)
      .catch(e => {
        console.error(e)
        process.exit(1)
      })
      .then(() => process.exit())
  })

program.parse(process.argv)
