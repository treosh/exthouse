const { execSync } = require('child_process')
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
const { unzipExtensions, log, drawChart } = require('./utils')
const { tmpDir, resultsDir, totalRuns, lhConfig, chromeExtensions, firefoxExtensions, browsers } = require('./settings')

const measureExtensionInChrome = async ({ extension, extName, url, extPath }) => {
  const extDir = join(resultsDir, extension ? extension.name : 'Default')
  await emptyDir(extDir)

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
    disableDeviceEmulation: true
  }

  const { lhr } = await lighthouse(url, lhFlags, lhConfig)
  writeFileSync(join(extDir, new Date().toJSON() + '.json'), JSON.stringify(lhr, null, '  '))
  const tti = Math.round(lhr.audits['interactive'].rawValue)

  await browser.close()

  return {
    name: extName,
    tti
  }
}

const measureExtensionInFirefox = async ({ extension, extName, url, extPath }) => {
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
    tti: result
  }
}

const measureExtension = {
  [browsers.CHROME]: measureExtensionInChrome,
  [browsers.FIREFOX]: measureExtensionInFirefox
}

const extensions = {
  [browsers.CHROME]: chromeExtensions,
  [browsers.FIREFOX]: firefoxExtensions
}

// main
async function main(url, options = {}) {
  let { json, browserType = browsers.CHROME } = options
  log(`URL: ${url}`, 'blue')
  const spinner = ora('Processing extensions \n').start()
  await emptyDir(tmpDir)
  await unzipExtensions({ extensions: extensions[browserType], browserType })

  const allExtensions = Array.apply(null, { length: totalRuns }).reduce((result = []) => {
    result.push(...[null].concat(extensions[browserType]))
    return result
  }, [])

  const mapper = async extension => {
    const extName = extension ? extension.name : 'Default (no extension)'
    const extPath = extension ? join(tmpDir, browserType, extension.name) : null

    try {
      return measureExtension[browserType]({ extension, extName, url, extPath })
    } catch (e) {
      log(e.message, 'red')
      return {
        name: extName,
        tti: 0
      }
    }
  }

  execSync('./node_modules/.bin/throttle --start --down 1600 --up 768 --rtt 75')
  const data = await pMap(allExtensions, mapper, { concurrency: totalRuns })
  execSync('./node_modules/.bin/throttle --stop')

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
    if (json) {
      log(`\n${name}:`, 'yellow')

      for (const tti of ttiArr) {
        log(`TTI: ${tti}`)
      }
      log(`TTI (median of ${totalRuns}): ${medianTTI}`, 'rgb(255,131,0)')
    }

    return {
      name,
      tti: medianTTI
    }
  })

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

  spinner.succeed()

  return results
}

exports.extensions = main
