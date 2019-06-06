const { join, basename, isAbsolute } = require('path')
const { writeFileSync } = require('fs')
const { emptyDir } = require('fs-extra')
const { median } = require('simple-statistics')
const unzipCrx = require('unzip-crx')
const log = require('./utils/logger')
const { measureChromium } = require('./utils/measure-chromium')
const { tmpDir, defaultTotalRuns, defaultName } = require('./config')

/**
 * @typedef {Object} Options
 * @property {string} url
 * @property {number} [totalRuns]
 * @property {string} [format]
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
 * @return {Promise<Object>} - lhr result for analysed extension
 */

exports.launch = async function(extSource, opts) {
  log.info(`URL: %s`, opts.url)
  const totalRuns = opts.totalRuns || defaultTotalRuns
  const extList = await getExtensions(extSource)
  const ext = extList[0]
  const extListWithDefault = [getDefaultExt()].concat(extList)
  /** @type {{ [key: string]: Object }} */
  const results = {}
  await emptyDir(tmpDir)
  await unzipExtensions(extList)
  for (const ext of extListWithDefault) {
    log.info('Analyze (%sx): %s', totalRuns, ext.name)
    const fidValues = []
    /** @type {{ [key: string]: Object }} */
    const lhrValues = {}
    for (let i = 1; i <= totalRuns; i++) {
      try {
        const { lhr } = await measureChromium(opts.url, ext)
        const FID = Math.round(lhr.audits['max-potential-fid'].numericValue || 0)
        fidValues.push(FID)
        lhrValues[FID] = lhr
      } catch (e) {
        log.error(e)
      }
    }

    const medianLhr = lhrValues[median(fidValues)]

    results[ext.name] = medianLhr

    saveToJson(ext.name, medianLhr)
  }

  return results[ext.name]
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
 * @param {string} name
 * @param {Object} data
 */

function saveToJson(name, data) {
  writeFileSync(
    join(process.cwd(), `unslow-${name}-results-${new Date().toJSON()}.json`),
    JSON.stringify(data, null, '  ')
  )
}
