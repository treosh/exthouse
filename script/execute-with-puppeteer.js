const chalk = require('chalk')
const ora = require('ora')
const wunderbar = require('@gribnoysup/wunderbar')
const percentile = require('percentile')
const inRange = require('in-range')
const pMap = require('p-map')
const eol = require('os').EOL
const { emptyDir } = require('fs-extra')
const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse')
const { median } = require('simple-statistics')
const { URL } = require('url')
const { join } = require('path')
const { writeFileSync } = require('fs')
const unzip = require('unzip-crx')

// config
const totalRuns = 7
const extensions = [
  { source: 'Grammarly-for-Chrome_v14.883.1937.crx', name: 'Grammarly' },
  { source: 'Evernote-Web-Clipper_v7.8.0.crx', name: 'Evernote Web Clipper' },
  { source: 'Honey_v10.8.1.crx', name: 'Honey' },
  { source: 'LastPass_-Free-Password-Manager_v4.19.0.crx', name: 'LastPass' },
  { source: 'Ghostery-–-Privacy-Ad-Blocker_v8.2.5.crx', name: 'Ghostery' },
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

const log = (text, color = 'gray') => {
  console.log(chalk` {${color} ${text}} `)
}

// main
async function main(url, options = {}) {
  const { json } = options
  log(`URL: ${url}`, 'blue')
  const spinner = ora('Processing extensions').start()
  await emptyDir(tmpDir)
  await unzipExtensions()

  const allExtensions = Array.apply(null, { length: totalRuns }).reduce((result = []) => {
    result.push(...[null].concat(extensions))
    return result
  }, [])

  const mapper = async extension => {
    const extName = extension ? extension.name : 'Default (no extension)'
    const crxPath = extension ? join(tmpDir, extension.name) : null
    const extDir = join(resultsDir, extension ? extension.name : 'Default')
    try {
      await emptyDir(extDir)

      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: crxPath ? [`--disable-extensions-except=${crxPath}`, `--load-extension=${crxPath}`] : []
      })
      const page = await browser.newPage()
      if (crxPath) await page.waitFor(11000) // await extension to be installed

      const lhFlags = { port: new URL(browser.wsEndpoint()).port, output: 'json', preset: 'perf' }

      const { lhr } = await lighthouse(url, lhFlags, lhConfig)
      writeFileSync(join(extDir, new Date().toJSON() + '.json'), JSON.stringify(lhr, null, '  '))
      const tti = Math.round(lhr.audits['interactive'].rawValue)

      await browser.close()

      return {
        name: extName,
        tti
      }
    } catch (e) {
      log(e.message, 'red')
      return {
        name: extName,
        tti: 0
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

const drawChart = (results, options) => {
  const data = results.slice(0)
  data.sort(function(a, b) {
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
      color
    }
  })

  const { __raw } = wunderbar(normalizedData, {
    min: xmin,
    max: xmax,
    length: width,
    format: '0,000'
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

exports.extensions = main
