#!/usr/bin/env node

const program = require('commander')
const { join } = require('path')
const { existsSync } = require('fs')
const { launch } = require('../src')
const { browsers } = require('../src/settings')
const { version } = require('../package.json')

program
  .name('unslow')
  .usage('[path/to/extension.crx] [options]')
  .option('-f, --folder <dir>', 'analyze the folder with extensions')
  .option('-r, --runs <number>', 'amount of runs to evaluate median performance value', '5')
  .option('-u, --url <url>', 'url to evaluate extension performance', 'https://example.com/')
  .option('-o, --output <format>', 'output format options: [cli, json]', 'json')
  .version(version)

program.parse(process.argv)

if (!program.args[0] && !program.folder) {
  console.error('')
  console.error('Error: provide a path to extension or a folder containing extensions.')
  console.error('')
  console.error('Examples:')
  console.error('')
  console.error('   unslow path/to/extension.crx')
  console.error('   unslow --folder=path/to/extension')
  console.error('')
  process.exit(1)
}

const path = join(process.cwd(), program.args[0])
const opts = { output: program.output, folder: program.folder, url: program.url, runs: parseInt(program.runs) }

if (!existsSync(path)) {
  console.error(`Invalid path to extension: ${path}`)
  process.exit(1)
}

console.log(path, opts)
