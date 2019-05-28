#!/usr/bin/env node

const program = require('commander')
const extensions = require('../src')
const { version } = require('../package.json')

program
  .usage('extensions --url https://treo.sh/')
  .version(version)
  .option('--url <url>', 'url to test extension', 'https://example.com/')
  .option('--json', 'output results in json format')
  .option('--extSourceDir <path>', 'folder with extensions')
  .option('--browserType <type>', 'specify the type of browser')

program.parse(process.argv)

const url = program.url
const flags = { json: program.json, extSourceDir: program.extSourceDir, browserType: program.browserType }

extensions(url, flags)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .then(() => process.exit())
