#!/usr/bin/env node

// @todo find some cool branding name
const { launch } = require('../')

const argv = process.argv.slice(2)
const flags = {}

argv
  .filter(f => f.startsWith('-'))
  .forEach(f => {
    const keyValue = f.split('=')
    const flagKey = keyValue[0].replace(/-*/, '')
    flags[flagKey] = keyValue[1] || true
  })

const extSourceDir = argv.filter(f => !f.startsWith('-')).shift()

if (!flags.url || flags.help) {
  console.error('Usage:')
  console.error('    extensions /root/my-folder-with-extensions')
  console.error('    extensions --url=http://example.com/ --json')
  console.error('    extensions --url=http://example.com/ --json')
  console.error('    extensions --url=http://example.com/ --browserType=ff')
  //@todo add totalRuns flag
  //@todo add browser binary path
  //@todo add save path for results

  return
}

launch(extSourceDir, flags)
  .catch(e => console.error(e) && process.exit(1))
  .then(() => process.exit())
