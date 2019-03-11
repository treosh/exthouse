const { join } = require('path')

exports.tmpDir = join(__dirname, '../tmp')
exports.resultsDir = join(__dirname, '../results')
exports.extensionsDir = join(__dirname, '../extensions')
exports.totalRuns = 1
exports.lhConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance']
  }
}
exports.chromeExtensions = [
  { source: 'Grammarly-for-Chrome_v14.883.1937.crx', name: 'Grammarly' },
  { source: 'Evernote-Web-Clipper_v7.8.0.crx', name: 'Evernote Web Clipper' },
  { source: 'Honey_v10.8.1.crx', name: 'Honey' },
  { source: 'LastPass_-Free-Password-Manager_v4.19.0.crx', name: 'LastPass' },
  { source: 'Ghostery-–-Privacy-Ad-Blocker_v8.2.5.crx', name: 'Ghostery' },
  { source: 'AdBlock_v3.34.0.crx', name: 'AdBlock' }
]
exports.firefoxExtensions = [
  { source: 'grammarly_for_firefox-8.845.2049-an+fx.xpi', name: 'Grammarly' },
]
exports.browsers = {
  CHROME: 'chrome',
  FIREFOX: 'ff',
}