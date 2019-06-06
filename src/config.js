const { join } = require('path')

exports.tmpDir = join(process.cwd(), 'tmp')
exports.formats = {
  json: 'json'
}
exports.browsers = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge'
}

exports.cacheType = {
  cold: 'cold',
  warm: 'warm',
  hot: 'hot'
}

// defaults

exports.defaultName = 'Default'
exports.defaultTotalRuns = 5
exports.defaultFormat = exports.formats.json
exports.defaultCacheType = exports.cacheType.cold
exports.defaultUrl = 'https://example.com/'
