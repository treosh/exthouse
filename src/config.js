const { join } = require('path')

exports.tmpDir = join(process.cwd(), 'exthouse')
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
exports.defaultFormat = exports.formats.html
exports.defaultCacheType = exports.cacheType.cold
exports.defaultUrl = 'https://example.com/'
