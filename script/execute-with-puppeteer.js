const ora = require('ora')
const wunderbar = require('@gribnoysup/wunderbar')
const percentile = require('percentile')
const webExt = require('web-ext').default
const throttle = require('@sitespeed.io/throttle');
const inRange = require('in-range')
const pMap = require('p-map')
const eol = require('os').EOL
const { emptyDir } = require('fs-extra')
const PP = require('puppeteer')
const PP_FF = require('puppeteer-firefox')
const lighthouse = require('lighthouse')
const { median } = require('simple-statistics')
const { URL } = require('url')
const { join } = require('path')
const { writeFileSync } = require('fs')
const { unzipExtensions, log } = require('./utils')
const { tmpDir, resultsDir, totalRuns, lhConfig, chromeExtensions, firefoxExtensions, browsers } = require('./settings')

const measureExtensionInChrome = async ({ extension, extName, url, extPath }) => {
  const extDir = join(resultsDir, extension ? extension.name : 'Default')
  await emptyDir(extDir)

  const browser = await PP.launch({
    headless: false,
    defaultViewport: null,
    args: extPath ? [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`] : [],
  })
  const page = await browser.newPage()
  if (extPath) await page.waitFor(11000) // await extension to be installed

  const lhFlags = { port: new URL(browser.wsEndpoint()).port, output: 'json', preset: 'perf' }

  const { lhr } = await lighthouse(url, lhFlags, lhConfig)
  writeFileSync(join(extDir, new Date().toJSON() + '.json'), JSON.stringify(lhr, null, '  '))
  const tti = Math.round(lhr.audits['interactive'].rawValue)

  await browser.close()

  return {
    name: extName,
    tti,
  }
}

const measureExtensionInFirefox = async ({ extension, extName, url, extPath }) => {
  let extensionRunners
  let browser

  if (extPath) {
    const CDPPort = 6006

    extensionRunners = await webExt.cmd.run({
      sourceDir: extPath,
      // comment if connect to default FF
      firefox: PP_FF.executablePath(),
      binaryArgs: [
        `-juggler=${CDPPort}`
      ]
    }, {
      // These are non CLI related options for each function.
      // You need to specify this one so that your NodeJS application
      // can continue running after web-ext is finished.
      shouldExitProgram: false,
    })

    const browserWSEndpoint = `ws://127.0.0.1:${CDPPort}`
    browser = await PP_FF.connect({
      browserWSEndpoint,
    })
  } else {
    browser = await PP_FF.launch({
      headless: false,
    })
  }

  const page = await browser.newPage()
  if (extPath) await page.waitFor(11000) // await extension to be installed

  // throttle since FF_PP can't do that, yet
  // it requires password from sudo which breaks running process of cli
  // run from console `throttle --start`, then `throttle --stop` then uncomment lines below
  // await throttle.start({
  //   down: 1600,
  //   up: 768,
  //   rtt: 75
  // })
  await page.goto(url, {
    waitUntil: ['load'],
  })
  const result = await page.evaluate(() => {
    return performance.now()
  })
  // await throttle.stop()
  if (extPath) extensionRunners.exit()
  await browser.close()

  return {
    name: extName,
    tti: result,
  }
}

const measureExtension = {
  [browsers.CHROME]: measureExtensionInChrome,
  [browsers.FIREFOX]: measureExtensionInFirefox,
}

const extensions = {
  [browsers.CHROME]: chromeExtensions,
  [browsers.FIREFOX]: firefoxExtensions,
}

// main
async function main(url, options = {}) {
  let { json, browserType = browsers.CHROME } = options
  log(`URL: ${url}`, 'blue')
  const spinner = ora('Processing extensions').start()
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
        tti: 0,
      }
    }
  }

  const data = await pMap(allExtensions, mapper, { concurrency: totalRuns })

  const mergedData = data.reduce((r, d) => {
    r[d.name] = r[d.name] || {}
    r[d.name].ttiArr = r[d.name].ttiArr || []
    r[d.name].ttiArr.push(d.tti)
    r[d.name] = {
      name: d.name,
      ttiArr: r[d.name].ttiArr,
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
      tti: medianTTI,
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
    lmargin: maxLabelWidth + 1,
  })

  spinner.succeed()

  return results
}

const drawChart = (results, options) => {
  const data = results.slice(0)
  data.sort(function (a, b) {
    return a.tti - b.tti
  })

  const { lmargin, width, xlabel, xmin, xmax } = options

  const normalizedData = data.map(value => {
    const { tti, name } = value
    const percentile100 = percentile(100, data, item => item.tti)
    const percentile65 = percentile(65, data, item => item.tti)
    const percentile40 = percentile(40, data, item => item.tti)
    const percentile20 = percentile(20, data, item => item.tti)
    let color

    if (inRange(tti, percentile100.tti, percentile65.tti)) {
      color = 'red'
    } else if (inRange(tti, percentile40.tti, percentile65.tti)) {
      color = '#ff8300'
    } else if (inRange(tti, percentile20.tti)) {
      color = 'green'
    }

    return {
      value: tti,
      label: name,
      color,
    }
  })

  const { __raw } = wunderbar(normalizedData, {
    min: xmin,
    max: xmax,
    length: width,
    format: '0,000',
  })

  const { normalizedValues, minValueFormatted, maxValueFormatted } = __raw

  const yAxis = '│'
  const xAxis = '─'
  const corner = '╰'

  const padding = ' '.repeat(lmargin)

  const chart = normalizedValues
    .reverse()
    .map(value => {
      const pad = lmargin - value.label.length
      const paddedLabel = ' '.repeat(pad > 0 ? pad : 0) + value.label

      return `${paddedLabel} ${yAxis}${value.coloredChartBar} ${value.formattedValue}`
    })
    .join(`${eol}${padding} ${yAxis}${eol}`)

  const chartTop = `${padding} ${yAxis}`

  const chartBottom = `${padding} ${corner}${xAxis.repeat(width)}`

  const labelPadding = ' '.repeat(Math.max(0, (width - xlabel.length - 2) / 2))

  const chartScale = `${padding}  ${minValueFormatted}${labelPadding}${xlabel}${labelPadding}${maxValueFormatted}`

  console.log('')
  console.log([chartTop, chart, chartBottom, chartScale].join(eol))
  console.log('')
}

exports.extensions = main
