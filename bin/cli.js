#!/usr/bin/env node

const program = require('commander')
const globby = require('globby')
const { launch } = require('../src')
const log = require('../src/utils/logger')
const { output, defaultTotalRuns, defaultOutput } = require('../src/config')
const { version } = require('../package.json')

program
  .name('unslow')
  .usage('[path/to/extension.crx] [options]')
  .option('-f, --folder <dir>', 'analyze the folder with extensions')
  .option('-r, --runs <number>', 'amount of runs to evaluate median performance value', defaultTotalRuns)
  .option('-u, --url <url>', 'url to evaluate extension performance', 'https://example.com/')
  .option('-o, --output <format>', `output format options: [${Object.values(output)}]`, defaultOutput)
  .version(version)

program.parse(process.argv)

const opts = {
  output: program.output,
  url: program.url,
  totalRuns: Number(program.runs)
}

const files = globby.sync(program.args)
launch(files, opts)
  .catch(e => {
    log.error(e.message)
    log.info('\n Run:\n  unslow --help\n')
    process.exit(1)
  })
  .then(() => process.exit())
