const { join, basename, isAbsolute } = require('path')
const { writeFileSync } = require('fs')
const { emptyDir } = require('fs-extra')
const { median } = require('simple-statistics')
const unzipCrx = require('unzip-crx')
const { drawChart } = require('./utils/draw-chart')
const log = require('./utils/logger')
const { measureChromium } = require('./utils/measure-chromium')
const { tmpDir, defaultTotalRuns, defaultName, formats } = require('./config')

/**
 * @typedef {Object} Options
 * @property {string} url
 * @property {number} [totalRuns]
 * @property {string} [format]
 * @property {boolean} [noDefault]
 */

/**
 * @typedef {Object} Extension
 * @property {string} name
 * @property {string} [source]
 * @property {string} [path]
 */

/**
 * @typedef {Object} Result
 * @property {string} name
 * @property {number} tti
 * @property {number[]} ttiValues
 */

/**
 * Launch analysis.
 *
 * @param {string[]} extSource
 * @param {Options} opts
 */

exports.launch = async function(extSource, opts) {
  log.info(`URL: %s`, opts.url)
  const totalRuns = opts.totalRuns || defaultTotalRuns
  const extList = await getExtensions(extSource)
  const extListWithDefault = (opts.noDefault ? [] : [getDefaultExt()]).concat(extList)
  const results = []
  await emptyDir(tmpDir)
  await unzipExtensions(extList)

  for (const ext of extListWithDefault) {
    log.info('Analyze (%sx): %s', totalRuns, ext.name)
    const ttiValues = []
    const fcpValues = []
    const networkReqValues = []
    const networkRTTValues = []
    const longTasksValues = []
    const bootupTasksValues = []
    const lhrValues = []
    for (let i = 1; i <= totalRuns; i++) {
      try {
        const { lhr } = await measureChromium(opts.url, ext)
        const tti = Math.round(lhr.audits.interactive.numericValue || 0)
        const FCP = Math.round(lhr.audits['first-contentful-paint'].numericValue || 0)
        const networkReq = Math.round(lhr.audits['network-requests'].numericValue || 0)
        const networkRTT = Math.round(lhr.audits['network-rtt'].numericValue || 0)
        const longTasks = getLongTasks(lhr)
        const bootupTasks = getBootupTasks(lhr)
        networkReqValues.push(networkReq)
        networkRTTValues.push(networkRTT)
        ttiValues.push(tti)
        longTasksValues.push(longTasks)
        bootupTasksValues.push(bootupTasks)
        fcpValues.push(FCP)
        lhrValues.push(lhr)
      } catch (e) {
        log.error(e)
      }
    }
    results.push({
      name: ext.name,
      tti: median(ttiValues),
      fcp: median(fcpValues),
      networkReq: median(networkReqValues),
      networkRTT: median(networkRTTValues),
      ttiValues,
      longTasksValues,
      bootupTasksValues,
      fcpValues
    })
  }

  if (opts.format === formats.json) {
    saveToJson(results)
  } else {
    showInCLI(results)
  }

  return results
}

/** @param {Object} lhr */
function getLongTasks(lhr) {
  if (!lhr.audits['main-thread-tasks'] || !lhr.audits['main-thread-tasks'].details) return []
  /** @type {{ duration: number }[]} */
  const allTasks = lhr.audits['main-thread-tasks'].details.items
  return allTasks.filter(task => task.duration >= 50)
}

/** @param {Object} lhr */
function getBootupTasks(lhr) {
  if (!lhr.audits['bootup-time'] || !lhr.audits['bootup-time'].details) return []
  /** @type {{ duration: number }[]} */
  return lhr.audits['bootup-time'].details.items
}

/**
 * @param {string[]} extSource
 * @return {Extension[]}
 */

function getExtensions(extSource) {
  const files = extSource.filter(file => file.endsWith('.crx'))
  if (!files.length) throw new Error('no extensions found')
  return files.map(file => {
    return {
      source: isAbsolute(file) ? file : (process.cwd(), file),
      path: join(tmpDir, basename(file)),
      name: basename(file).replace('.crx', '')
    }
  })
}

/**
 * @return {Extension}
 */

function getDefaultExt() {
  return { name: defaultName }
}

/**
 * @param {Extension[]} extList
 * @return {Promise}
 */

function unzipExtensions(extList) {
  return Promise.all(extList.map(ext => unzipCrx(ext.source, ext.path)))
}

/**
 * @param {Object} data
 */

function saveToJson(data) {
  writeFileSync(join(process.cwd(), `unslow-results-${new Date().toJSON()}.json`), JSON.stringify(data, null, '  '))
}

/**
 * @param {Array<Object>} results
 */

function showInCLI(results) {
  const fullWidthInMs = Math.max(...results.map(result => result.tti))
  const maxLabelWidth = Math.max(...results.map(result => result.name.length))
  const terminalWidth = process.stdout.columns || 90

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
