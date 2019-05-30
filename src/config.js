const { join } = require('path')

exports.tmpDir = join(process.cwd(), 'tmp')
exports.output = {
  cli: 'cli',
  json: 'json'
}
exports.browsers = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge'
}

// defaults

exports.defaultTotalRuns = 5
exports.defaultOutput = exports.output.cli
