const chalk = require('chalk')
const ora = require('ora')
const wunderbar = require('@gribnoysup/wunderbar')
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

const warnColor = 'rgb(255,131,0)'

// main
async function main(url, options = {}) {
  const { json } = options
  log(`URL: ${url}`, 'blue')
  const spinner = ora('Processing extensions').start()
  await emptyDir(tmpDir)
  await unzipExtensions()

  const results = await Promise.all(
    [null]
      .concat(extensions)
      .reverse()
      .map(async extension => {
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

          const results = []
          const lhFlags = { port: new URL(browser.wsEndpoint()).port, output: 'json', preset: 'perf' }

          for (let i = 1; i <= totalRuns; i++) {
            const { lhr } = await lighthouse(url, lhFlags, lhConfig)
            writeFileSync(join(extDir, new Date().toJSON() + '.json'), JSON.stringify(lhr, null, '  '))
            const tti = Math.round(lhr.audits['interactive'].rawValue)
            results.push(tti)
          }

          const medianTTI = median(results)

          await browser.close()

          if (json) {
            log(`\n${extName}:`, 'yellow')

            for (const tti of results) {
              log(`TTI: ${tti}`)
            }
            log(`TTI (median of ${totalRuns}): ${medianTTI}`, warnColor)
          }

          return {
            name: extName,
            tti: medianTTI
          }
        } catch (e) {
          log(e.message, 'red')
          return {
            name: extName,
            tti: 0
          }
        }
      })
  )

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
    return {
      value: value.tti,
      label: value.name,
      color: 'blue'
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
