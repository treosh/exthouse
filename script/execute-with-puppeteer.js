const { existsSync, mkdirSync } = require('fs')
const puppeteer = require('puppeteer')
const devices = require('puppeteer/DeviceDescriptors')
const { readFileSync: readFile } = require('fs')
const { join, resolve } = require('path')
const { extensions } = require('./extensions')
const { unzipAll } = require('./unzip-crx')

const ttiSrc = readFile(join(__dirname, '../', 'node_modules/tti-polyfill/tti-polyfill.js'), 'utf8')
const longTasksSrc = [
  "!function(){if('PerformanceLongTaskTiming' in window){var g=window.__lt={e:[]};",
  'g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});',
  "g.o.observe({entryTypes:['longtask']})}}();"
].join('')
const url = 'https://booking.com'

const TMP_FOLDER = resolve(__dirname, '../tmp')

async function run(browser) {
  const page = await browser.newPage()
  // await extension to be installed
  await page.waitFor(5000)
  await page.emulate(devices['Nexus 5X'])
  await page.evaluateOnNewDocument(longTasksSrc)
  await page.evaluateOnNewDocument(ttiSrc)

  const client = await page.target().createCDPSession()

  // based on
  // network conditions: https://github.com/GoogleChrome/lighthouse/blob/394468bb7554ce7009caa1f5bcf39e39879bade0/lighthouse-core/config/constants.js#L24
  // emulation commands: https://github.com/GoogleChrome/lighthouse/blob/2daa2cd0a398b323f83eaa103ba957530aade35a/lighthouse-core/lib/emulation.js#L141
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 0.9 * 1024) / 8,
    uploadThroughput: (750 * 0.9 * 1024) / 8,
    latency: 150 * 0.9
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  // extensions:
  // https://github.com/GoogleChrome/puppeteer/blob/v1.10.0/docs/api.md#working-with-chrome-extensions

  await page.goto(url)
  const result = await page.evaluate(() => {
    return window.ttiPolyfill.getFirstConsistentlyInteractive()
  })
  await browser.close()
  console.log(JSON.stringify(result, null, '  '))
}

async function launchBrowserWithExtension(CRX_PATH) {
  return puppeteer.launch({
    headless: false,
    args: [`--disable-extensions-except=${CRX_PATH}`, `--load-extension=${CRX_PATH}`]
  })
}

async function runWithExtension(extName) {
  const browser = await launchBrowserWithExtension(resolve(TMP_FOLDER, extName))
  await run(browser)
}

async function runWithoutExtension() {
  const browser = await puppeteer.launch()
  await run(browser)
}

/* borrowed from https://stackoverflow.com/questions/43202432/generator-function-with-yield-promise-all */
function* generator(processNodes, task) {
  var limit = 2
  var queue = []
  for (let i = 0; i < processNodes.length; i++) {
    queue.push(task(processNodes[i]))
    if (queue.length >= limit) {
      yield Promise.all(queue)
      // clears the queue after pushing
      queue = []
    }
  }
  // make sure the receiver gets the full queue :)
  if (queue.length !== 0) {
    yield Promise.all(queue)
  }
}

function runThroughArguments(args, task) {
  return new Promise(function(resolve) {
    setTimeout(() => {
      var nodes = generator(args, task)
      var iterator = nodes.next()

      if (!iterator.done) {
        // if it's not done, we have to recall the functionallity
        iterator.value.then(function q() {
          setTimeout(() => {
            iterator = nodes.next()
            if (!iterator.done && iterator.value) {
              // call the named function (in this case called q) which is this function after the promise.all([]) completed
              iterator.value.then(q)
            } else {
              // everything finished and all promises are through
              resolve()
            }
          }, 2)
        })
      } else {
        iterator.value.then(resolve)
      }
    }, 2)
  })
}

/* end */

;(async () => {
  try {
    console.log('Running...')

    if (!existsSync(TMP_FOLDER)) {
      mkdirSync(TMP_FOLDER)
      await unzipAll(extensions)
    }

    const runs = Array(5)
    const extNames = extensions.map(ext => ext.name)

    await runThroughArguments(runs, runWithoutExtension)
    console.log('Results without extension \n')

    /* Better to read and maintain but produce results like in random order

    // 13283.359999999448
    // Results with extension AdBlock_v3
    //
    // 14285.979999998744
    // Results with extension Grammarly
    //
    // 14519.274999998743
    // Results with extension AdBlock_v3
    //
    // 14335.17000000029
    // Results with extension Grammarly
    //
    // 14125.390000001062
    // Results with extension Grammarly

    const runOneExt = (extName) => {
      return runThroughArguments(
        [...runs.fill(extName)],
        runWithExtension)
    }

    const runAllExtensions = extNames.reduce((acc = [], extName) => {
      acc.push(runOneExt(extName))
      return acc
    }, [])

    await Promise.all(runAllExtensions)

    */

    // @TODO improve with solution above

    await runThroughArguments([...runs.fill(extNames[0])], runWithExtension)
    console.log(`Results with extension ${extNames[0]}\n`)

    await runThroughArguments([...runs.fill(extNames[1])], runWithExtension)
    console.log(`Results with extension ${extNames[1]}\n`)

    process.exit()
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
