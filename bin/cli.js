#!/usr/bin/env node

const program = require('commander')
const globby = require('globby')
const { launch } = require('../src')
const { log } = require('../src/utils')
const { browsers, totalRuns, output } = require('../src/settings')
const { version } = require('../package.json')

program
  .name('unslow')
  .usage('[path/to/extension.crx] [options]')
  .option('-f, --folder <dir>', 'analyze the folder with extensions')
  .option('-r, --runs <number>', 'amount of runs to evaluate median performance value', totalRuns)
  .option('-u, --url <url>', 'url to evaluate extension performance', 'https://example.com/')
  .option('-o, --output <format>', `output format options: [${Object.values(output)}]`, output.json)
  .option('-b, --browserPath <format>', 'path to the browser')
  .option('-t, --browserType <string>', `type of browser: [${Object.values(browsers)}]`, browsers.CHROME)
  .version(version)

program.parse(process.argv)

const opts = {
  output: program.output,
  url: program.url,
  runs: Number(program.runs),
  browserPath: program.browserPath,
  browserType: program.browserType
}

const files = globby.sync(program.args)
launch(files[0], opts)
  .catch(e => {
    log(e.message)
    log(`Run:
      unslow --help
    `)
    process.exit(1)
  })
  .then(() => process.exit())
