const { join } = require('path')
const { writeFileSync } = require('fs')
const ora = require('ora')
const webExt = require('web-ext').default
const getPort = require('get-port')
const pMap = require('p-map')
const { emptyDir } = require('fs-extra')
const PP = require('puppeteer')
const PP_FF = require('puppeteer-firefox')
const lighthouse = require('lighthouse')
const { median } = require('simple-statistics')
const { URL } = require('url')
const { unzipExtensions, log, drawChart, getExtensionsFromFolder, getExtensions } = require('./utils')
const { validateInput } = require('./validator')
const {
  tmpDir,
  totalRuns: defaultTotalRuns,
  lhConfig,
  browsers,
  output: defaultOutput
} = require('./settings')

const measureExtensionInChrome = async ({ extName, url, extPath }) => {
  const browser = await PP.launch({
    headless: false,
    defaultViewport: null,
    args: extPath ? [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`] : []
  })
  const page = await browser.newPage()
  if (extPath) await page.waitFor(11000) // await extension to be installed

  const lhFlags = {
    port: new URL(browser.wsEndpoint()).port,
    output: 'json',
    preset: 'perf',
    emulatedFormFactor: 'none'
  }

  const { lhr } = await lighthouse(url, lhFlags, lhConfig)
  const tti = Math.round(lhr.audits['interactive'].numericValue)

  await browser.close()

  return {
    name: extName,
    tti,
    lhr
  }
}

const measureExtensionInFirefox = async ({ extName, url, extPath }) => {
  let extensionRunners
  let browser

  if (extPath) {
    // @todo wait for https://github.com/sindresorhus/get-port/pull/28 and than use range for 6000 port
    const CDPPort = await getPort()

    extensionRunners = await webExt.cmd.run(
      {
        sourceDir: extPath,
        // comment if connect to default FF
        firefox: PP_FF.executablePath(),
        args: [`-juggler=${CDPPort}`]
      },
      {
        // These are non CLI related options for each function.
        // You need to specify this one so that your NodeJS application
        // can continue running after web-ext is finished.
        shouldExitProgram: false
      }
    )

    const browserWSEndpoint = `ws://127.0.0.1:${CDPPort}`
    browser = await PP_FF.connect({
      browserWSEndpoint
    })
  } else {
    browser = await PP_FF.launch({
      headless: false
    })
  }

  const page = await browser.newPage()
  if (extPath) await page.waitFor(11000) // await extension to be installed

  // throttle since Firefox can't do that, yet
  await page.goto(url, {
    waitUntil: ['load']
  })
  const result = await page.evaluate(() => {
    return performance.now() // eslint-disable-line
  })
  if (extPath) extensionRunners.exit()
  await browser.close()

  return {
    name: extName,
    tti: result,
    lhr: {}
  }
}

const measureExtension = {
  [browsers.CHROME]: measureExtensionInChrome,
  [browsers.FIREFOX]: measureExtensionInFirefox
}

const saveToJson = data => {
  writeFileSync(join(process.cwd(), `unslow-results-${new Date().toJSON()}.json`), JSON.stringify(data, null, '  '))
}

const showInCLI = results => {
  const fullWidthInMs = Math.max(...results.map(result => result.tti))
  const maxLabelWidth = Math.max(...results.map(result => result.name.length))
  const terminalWidth = +process.stdout.columns || 90

  drawChart(results, {
    // 90% of terminal width to give some right margin
    width: terminalWidth * 0.9 - maxLabelWidth,
    xlabel: 'Time (ms)',
    xmin: 0,
    // nearest second
    xmax: Math.ceil(fullWidthInMs / 1000) * 1000,
    lmargin: maxLabelWidth + 1
  })
}

async function measure(extSource, options = {}) {
  validateInput(extSource, options)

  const { url, folder, runs = defaultTotalRuns, browserType = browsers.CHROME } = options

  const extList = folder ? await getExtensionsFromFolder(folder, browserType) : await getExtensions(extSource)
  await emptyDir(tmpDir)
  await unzipExtensions({ extensions: extList, browserType })

  const allExtensions = Array.apply(null, { length: runs }).reduce((result = []) => {
    result.push(...[null].concat(extList))
    return result
  }, [])

  const mapper = async extension => {
    const extName = extension ? extension.name : 'Default (no extension)'
    const extPath = extension ? join(tmpDir, browserType, extension.name) : null
    try {
      return measureExtension[browserType]({ extName, url, extPath })
    } catch (e) {
      log(e.message, 'red')
      return {
        name: extName,
        tti: 0,
        lhr: {}
      }
    }
  }

  return pMap(allExtensions, mapper, { concurrency: 1 })
}

async function launch(extSource, options = {}) {
  try {
    const { url, output } = options
    const spinner = ora('Processing extensions \n').start()

    log(`URL: ${url}`, 'blue')

    const data = await measure(extSource, options)

    spinner.succeed()

    const mergedData = data.reduce((r, d) => {
      r[d.name] = r[d.name] || {}
      r[d.name].ttiArr = r[d.name].ttiArr || []
      r[d.name].ttiArr.push(d.tti)
      r[d.name] = {
        name: d.name,
        ttiArr: r[d.name].ttiArr
      }
      return r
    }, {})
    const results = Object.values(mergedData).map(result => {
      const { name, ttiArr } = result
      const medianTTI = median(ttiArr)
      return {
        name,
        tti: medianTTI
      }
    })

    if (output === defaultOutput.json) {
      saveToJson(data)
    } else {
      showInCLI(results)
    }

    return data
  } catch (e) {
    throw new Error(e)
  }
}

exports.launch = launch
exports.measure = measure
