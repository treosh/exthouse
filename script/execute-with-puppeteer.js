
const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const { readFileSync: readFile } = require('fs')
const { join } = require('path')

const perfumeSrc = readFile(join(__dirname, 'node_modules/tti-polyfill/tti-polyfill.js'), 'utf8')
const longTasksSrc = [
  "!function(){if('PerformanceLongTaskTiming' in window){var g=window.__lt={e:[]};",
  'g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});',
  "g.o.observe({entryTypes:['longtask']})}}();"
].join('')
const url = 'https://booking.com'

async function main() {
  const browser = await puppeteer.launch()
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

  await page.goto(url)
  const result = await page.evaluate(() => {    
    return ttiPolyfill.getFirstConsistentlyInteractive()
  })
  await browser.close()
  console.log(JSON.stringify(result, null, '  '))
}

// ~/Library/Application\ Support/Google/Chrome/Default/Extensions

main()
  .catch(e => console.error(e) && process.exit(1))
  .then(() => process.exit())
