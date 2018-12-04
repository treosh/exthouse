const { round } = require('lodash')
const { emptyDir } = require('fs-extra')
const { median } = require('simple-statistics')
const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const { readFileSync: readFile } = require('fs')
const { join } = require('path')
const unzip = require('unzip-crx')

// config

const url = 'https://booking.com'
const totalRuns = 7
const extensions = [
  { source: 'Grammarly-for-Chrome_v14.883.1937.crx', name: 'Grammarly' },
  { source: 'AdBlock_v3.34.0.crx', name: 'AdBlock' }
]
const tmpDirs = join(__dirname, '../tmp')
const extensionsDir = join(__dirname, '../extensions')
const ttiSrc = readFile(join(__dirname, '../', 'node_modules/tti-polyfill/tti-polyfill.js'), 'utf8')
const longTasksSrc = [
  "!function(){if('PerformanceLongTaskTiming' in window){var g=window.__lt={e:[]};",
  'g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});',
  "g.o.observe({entryTypes:['longtask']})}}();"
].join('')

// main

async function main() {
  await emptyDir(tmpDirs)
  await unzipExtensions()

  await run()
  for (const extension of extensions) await run(extension)

  async function run(extension) {
    const crxPath = extension ? join(tmpDirs, extension.name) : null
    const results = []
    console.log('\n%s:', extension ? extension.name : 'no extensions')
    for (let i = 1; i <= totalRuns; i++) {
      const result = await runPuppeteer(crxPath)
      results.push(result)
      console.log('TTI: %sms', result)
    }
    console.log('TTI (median of %s): %sms', totalRuns, median(results))
  }
}

// run main

main()
  .catch(e => console.error(e) && process.exit(1))
  .then(() => process.exit())

// run puppeteer with/without extension

async function runPuppeteer(crxPath = null) {
  const browser = await puppeteer.launch({
    headless: false,
    args: crxPath ? [`--disable-extensions-except=${crxPath}`, `--load-extension=${crxPath}`] : []
  })
  const page = await browser.newPage()
  if (crxPath) await page.waitFor(5000) // await extension to be installed

  await page.emulate(devices['Nexus 5X'])
  await page.evaluateOnNewDocument(longTasksSrc)
  await page.evaluateOnNewDocument(ttiSrc)

  const client = await page.target().createCDPSession()

  // network conditions: https://github.com/GoogleChrome/lighthouse/blob/394468bb7554ce7009caa1f5bcf39e39879bade0/lighthouse-core/config/constants.js#L24
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 0.9 * 1024) / 8,
    uploadThroughput: (750 * 0.9 * 1024) / 8,
    latency: 150 * 0.9
  })
  // cpu throttline: https://github.com/GoogleChrome/lighthouse/blob/2daa2cd0a398b323f83eaa103ba957530aade35a/lighthouse-core/lib/emulation.js#L141
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.goto(url)
  const result = await page.evaluate(() => window.ttiPolyfill.getFirstConsistentlyInteractive())

  await browser.close()
  return round(result)
}

// unzip all extensions

async function unzipExtensions() {
  return Promise.all(
    extensions.map(ext => {
      const extPath = join(extensionsDir, ext.source)
      const destinationPath = join(tmpDirs, ext.name)
      return unzip(extPath, destinationPath)
    })
  )
}
