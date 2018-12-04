const { emptyDir } = require('fs-extra')
const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse')
const { median } = require('simple-statistics')
const { URL } = require('url')
const { join } = require('path')
const { writeFileSync } = require('fs')
const unzip = require('unzip-crx')

// config

const url = 'https://www.booking.com/index.en-gb.html'
const totalRuns = 3
const extensions = [
  { source: 'Grammarly-for-Chrome_v14.883.1937.crx', name: 'Grammarly' },
  { source: 'Evernote-Web-Clipper_v7.8.0.crx', name: 'Evernote Web Clipper' },
  { source: 'Honey_v10.8.1.crx', name: 'Honey' },
  { source: 'Adblock-Plus_v3.4.2.crx', name: 'Adblock Plus' },
  { source: 'AdBlock_v3.34.0.crx', name: 'AdBlock' }
]
const lhConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance']
  }
}
const tmpDir = join(__dirname, '../tmp')
const resultsDir = join(__dirname, '../results')
const extensionsDir = join(__dirname, '../extensions')

// main

async function main() {
  await emptyDir(tmpDir)
  await unzipExtensions()

  for (const extension of [null].concat(extensions)) {
    const crxPath = extension ? join(tmpDir, extension.name) : null
    console.log('\n%s:', extension ? extension.name : 'Default (no extension)')
    const extDir = join(resultsDir, extension ? extension.name : 'Default')
    await emptyDir(extDir)

    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: crxPath ? [`--disable-extensions-except=${crxPath}`, `--load-extension=${crxPath}`] : []
    })
    const page = await browser.newPage()
    if (crxPath) await page.waitFor(12000) // await extension to be installed

    const results = []
    const lhFlags = { port: new URL(browser.wsEndpoint()).port, output: 'json', preset: 'perf' }

    for (let i = 1; i <= totalRuns; i++) {
      const { lhr } = await lighthouse(url, lhFlags, lhConfig)
      writeFileSync(join(extDir, new Date().toJSON() + '.json'), JSON.stringify(lhr, null, '  '))
      const tti = Math.round(lhr.audits['interactive'].rawValue)
      results.push(tti)
      console.log('TTI: %sms', tti)
    }

    await browser.close()
    console.log('TTI (median of %s): %sms', totalRuns, median(results))
  }
}

// run main

main()
  .catch(e => console.error(e) && process.exit(1))
  .then(() => process.exit())

// unzip all extensions

async function unzipExtensions() {
  return Promise.all(
    extensions.map(ext => {
      const extPath = join(extensionsDir, ext.source)
      const destinationPath = join(tmpDir, ext.name)
      return unzip(extPath, destinationPath)
    })
  )
}
