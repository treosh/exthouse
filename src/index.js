const { join, basename, isAbsolute } = require('path')
const fs = require('fs')
const { promisify } = require('util')
const { emptyDir } = require('fs-extra')
const { median } = require('simple-statistics')
const unzipCrx = require('unzip-crx')
const log = require('./utils/logger')
const { measureChromium } = require('./utils/measure-chromium')
const { tmpDir, defaultTotalRuns, defaultName, formats, defaultFormat } = require('./config')
const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const readdir = promisify(fs.readdir)

/**
 * @typedef {Object} Options
 * @property {string} url
 * @property {number} [totalRuns]
 * @property {string} [format]
 *
 * @typedef {Object} Extension
 * @property {string} name
 * @property {string} [source]
 * @property {string} [path]
 *
 * @typedef {Object} LhResult
 * @property {Object} audits
 * @property {{ total: number }} timing
 *
 * @typedef {Object} ExthouseResult
 * @property {Object} audits
 */

/**
 * Launch analysis.
 *
 * @param {string[]} extSource
 * @param {Options} opts
 * @return {Promise<ExthouseResult[]>}
 */

exports.launch = async function(extSource, opts) {
  await emptyDir(tmpDir)
  const extensions = await getExtensions(extSource)
  await gatherLighthouseReports(extensions, opts)

  const format = opts.format || defaultFormat
  return Promise.all(
    extensions.map(async ext => {
      const lhResult = await generateExtensionReport(ext)

      if (format === formats.html) {
        console.log('save html')
      } else {
        await saveExthouseResult(ext, lhResult)
      }
      return lhResult
    })
  )
}

/**
 * Gather lighthouse reports:
 *   1. use Lighthouse to estimate `opts.url` without extension.
 *   2. run Lighthouse audit on `opts.url` total of `opts.totalRuns` with installed extension
 *   3. save each Lighthouse result to `tmpDir`
 *
 * @param {Extension[]} extensions
 * @param {Options} opts
 */

async function gatherLighthouseReports(extensions, opts) {
  log.info(`URL: %s`, opts.url)
  const totalRuns = opts.totalRuns || defaultTotalRuns
  for (const ext of extensions) {
    log.info('Analyze %s (x%s times)', ext.name, totalRuns)
    for (let i = 1; i <= totalRuns; i++) {
      const startTime = Date.now()
      try {
        const { lhr } = await measureChromium(opts.url, ext)
        await saveDebugResult(ext, i, lhr)
        log.info('  %s: complete in %sms (lh: %sms)', i, Date.now() - startTime, Math.round(lhr.timing.total))
      } catch (e) {
        log.error(e)
      }
    }
  }
}

/**
 * @param {Extension} ext
 * @return {Promise<ExthouseResult>}
 */

async function generateExtensionReport(ext) {
  const defaultResult = await getMedianResult(getDefaultExt())
  const extResult = await getMedianResult(ext)
  return {
    audits: {}
  }
}

/**
 * @param {Extension} ext
 * @return {Promise<LhResult>}
 */

async function getMedianResult(ext) {
  const allFiles = await readdir(tmpDir)
  const extFiles = allFiles.filter(fileName => fileName.startsWith(ext.name))
  /** @type {LhResult[]} */
  const lhrs = await Promise.all(
    extFiles.map(async extFile => {
      return JSON.parse(await readFile(join(tmpDir, extFile), 'utf8'))
    })
  )
  const medianValues = lhrs.map(lhr => getMedianMetric(lhr))
  return lhrs[median(medianValues)]
}

/**
 * Use Max Potencial FID since it's mostly impacted by extensions.
 *
 * @param {LhResult} lhr
 * @return {number}
 */

function getMedianMetric(lhr) {
  return Math.round(lhr.audits['max-potential-fid'].numericValue || 0)
}

/**
 * @param {string[]} extSource
 * @return {Promise<Extension[]>}
 */

async function getExtensions(extSource) {
  const files = extSource.filter(file => file.endsWith('.crx'))
  if (!files.length) throw new Error('no extensions found')
  const extList = files.map(file => {
    return {
      source: isAbsolute(file) ? file : (process.cwd(), file),
      path: join(tmpDir, basename(file)),
      name: basename(file).replace('.crx', '')
    }
  })
  await unzipExtensions(extList)
  return [getDefaultExt()].concat(extList)
}

/**
 * @param {Extension[]} extList
 * @return {Promise}
 */

function unzipExtensions(extList) {
  return Promise.all(extList.map(ext => unzipCrx(ext.source, ext.path)))
}

/**
 * Get default extension.
 *
 * @return {Extension}
 */

function getDefaultExt() {
  return { name: defaultName }
}

/**
 * @param {Extension} ext
 * @param {ExthouseResult} exthouseResult
 */

function saveExthouseResult(ext, exthouseResult) {
  const resultPath = join(process.cwd(), `exthouse-${ext.name}-result-${new Date().toJSON()}.json`)
  return writeFile(resultPath, JSON.stringify(exthouseResult, null, '  '))
}

/**
 * Save debug report.
 *
 * @param {Extension} ext
 * @param {number} i
 * @param {LhResult} lhr
 */

function saveDebugResult(ext, i, lhr) {
  const reportPath = join(tmpDir, `${ext.name}-result-${i}-${new Date().toJSON()}.json`)
  return writeFile(reportPath, JSON.stringify(lhr, null, '  '))
}
