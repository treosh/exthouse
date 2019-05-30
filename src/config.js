const { join } = require('path')

exports.tmpDir = join(process.cwd(), 'tmp')
exports.formats = {
  cli: 'cli',
  json: 'json'
}
exports.browsers = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge'
}

// defaults

exports.defaultName = 'Default'
exports.defaultTotalRuns = 5
exports.defaultFormat = exports.formats.cli
