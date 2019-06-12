const { join } = require('path')

exports.tmpDir = join(process.cwd(), 'tmp')
exports.formats = {
  json: 'json',
  html: 'html'
}
exports.cacheType = {
  cold: 'cold',
  warm: 'warm',
  hot: 'hot'
}

// defaults

exports.defaultName = 'Default'
exports.defaultTotalRuns = 1
exports.defaultFormat = exports.formats.json
exports.defaultCacheType = exports.cacheType.cold
exports.defaultUrl = 'https://example.com/'
