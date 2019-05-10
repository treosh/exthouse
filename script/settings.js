const { join } = require('path')

exports.tmpDir = join(process.cwd(), 'tmp')
exports.extensionsDir = join(__dirname, '../extensions')
exports.totalRuns = 7
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
  { source: 'evernote_web_clipper-6.13-an+fx-mac.xpi', name: 'Evernote Web Clipper' },
  { source: 'honey-11.1.0-fx.xpi', name: 'Honey' },
  { source: 'lastpass_password_manager-4.26.0.4-fx.xpi', name: 'LastPass' },
  { source: 'ghostery_privacy_ad_blocker-8.3.1-an+fx.xpi', name: 'Ghostery' },
  { source: 'adblock_plus-3.5-an+fx.xpi', name: 'AdBlock' }
]
exports.browsers = {
  CHROME: 'chrome',
  FIREFOX: 'ff'
}
