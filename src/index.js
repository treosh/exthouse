const { join, basename, isAbsolute } = require('path')
const { writeFileSync } = require('fs')
const { emptyDir } = require('fs-extra')
const { median, sum } = require('simple-statistics')
const unzipCrx = require('unzip-crx')
const log = require('./utils/logger')
const { measureChromium } = require('./utils/measure-chromium')
const { tmpDir, defaultTotalRuns, defaultName } = require('./config')

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
    const fidValues = []
    const longTasksValues = []
    const bootupTasksValues = []
    for (let i = 1; i <= totalRuns; i++) {
      try {
        const { lhr } = await measureChromium(opts.url, ext)
        const tti = Math.round(lhr.audits.interactive.numericValue || 0)
        const FID = Math.round(lhr.audits['max-potential-fid'].numericValue || 0)
        const longTasks = getLongTasks(lhr)
        const bootupTasks = getBootupTasks(lhr)
        ttiValues.push(tti)
        fidValues.push(FID)
        longTasksValues.push(longTasks)
        bootupTasksValues.push(bootupTasks)
      } catch (e) {
        log.error(e)
      }
    }
    results.push({
      name: ext.name,
      tti: median(ttiValues),
      fid: median(fidValues),
      bootupTasksTotals: bootupTasksValues.reduce((acc, val, i) => {
        acc[i] = sum(
          val.map(
            /**
             * @param {Object} v
             * @returns {number}
             */
            v => v.total
          )
        )
        return acc
      }, []),
      bootupTasksScriptParseCompile: bootupTasksValues.reduce((acc, val, i) => {
        acc[i] = sum(
          val.map(
            /**
             * @param {Object} v
             * @returns {number}
             */
            v => v.scriptParseCompile
          )
        )
        return acc
      }, []),
      ttiValues,
      longTasksValues,
      bootupTasksValues
    })
  }

  saveToJson(results)

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
