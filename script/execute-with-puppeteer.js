const { existsSync, mkdirSync } = require('fs');
const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const { readFileSync: readFile } = require('fs')
const { join, resolve } = require('path')
const { extensions } = require('../extensions/extensions')
const { unzipAll } = require('./unzip-crx')

const perfumeSrc = readFile(join(__dirname, '../', 'node_modules/tti-polyfill/tti-polyfill.js'), 'utf8')
const longTasksSrc = [
  '!function(){if(\'PerformanceLongTaskTiming\' in window){var g=window.__lt={e:[]};',
  'g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});',
  'g.o.observe({entryTypes:[\'longtask\']})}}();',
].join('')
const url = 'https://booking.com'

const TMP_FOLDER = resolve(__dirname, '../tmp')

async function run(browser) {
  const page = await browser.newPage()
  await page.emulate(devices['Nexus 5X'])
  await page.evaluateOnNewDocument(longTasksSrc)
  await page.evaluateOnNewDocument(perfumeSrc)

  const client = await page.target().createCDPSession()

  // based on 
  // network conditions: https://github.com/GoogleChrome/lighthouse/blob/394468bb7554ce7009caa1f5bcf39e39879bade0/lighthouse-core/config/constants.js#L24
  // emulation commands: https://github.com/GoogleChrome/lighthouse/blob/2daa2cd0a398b323f83eaa103ba957530aade35a/lighthouse-core/lib/emulation.js#L141
  await client.send('Network.emulateNetworkConditions', {
    'offline': false,
    'downloadThroughput': 1.6 * 1024 * 0.9 * 1024 / 8,
    'uploadThroughput': 750 * 0.9 * 1024 / 8,
    'latency': 150 * 0.9,
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  // extensions:
  // https://github.com/GoogleChrome/puppeteer/blob/v1.10.0/docs/api.md#working-with-chrome-extensions

  await page.goto(url)
  const result = await page.evaluate(() => {
    return ttiPolyfill.getFirstConsistentlyInteractive()
  })
  await browser.close()
  console.log(JSON.stringify(result, null, '  '))
}

async function launchBrowserWithExtension(CRX_PATH) {
  return await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${CRX_PATH}`,
      `--load-extension=${CRX_PATH}`,
    ],
  })
}

async function runWithExtension(extName) {
  const browser = await launchBrowserWithExtension(resolve(TMP_FOLDER, extName));
  await run(browser)
}

async function runWithoutExtension() {
  const browser = await puppeteer.launch()
  await run(browser)
}

// ~/Library/Application\ Support/Google/Chrome/Default/Extensions

(async () => {
  try {
    if (!existsSync(TMP_FOLDER)) {
      mkdirSync(TMP_FOLDER);
      await Promise.all(unzipAll);
    }

    const extName = Object.keys(extensions)[0];

    const resultsWithoutExt = [
      runWithoutExtension(),
      runWithoutExtension(),
      runWithoutExtension(),
      runWithoutExtension(),
    ]
    const resultsWithExt = [
      runWithExtension(extName),
      runWithExtension(extName),
      runWithExtension(extName),
      runWithExtension(extName),
    ]

    console.log('Results without extension \n')
    await Promise.all(resultsWithoutExt)

    console.log(`Results with extension ${extName}`)
    await Promise.all(resultsWithExt)

    process.exit()
  } catch (e) {
    e => console.error(e) && process.exit(1)
  }
})();
