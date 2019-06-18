const { omit, indexOf } = require('lodash')
const { join } = require('path')
const fs = require('fs')
const { promisify } = require('util')
const { emptyDir } = require('fs-extra')
const ReportGenerator = require('lighthouse/lighthouse-core/report/report-generator')
const open = require('open')
const log = require('./utils/logger')
const { getExtensions, isDefaultExt, getDefaultExt, normalizeExtName } = require('./utils/extension')
const { measureChromium } = require('./utils/measure-chromium')
const { extendResultWithExthouseCategory } = require('./utils/analysis')
const { tmpDir, defaultTotalRuns, formats } = require('./config')
const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const readdir = promisify(fs.readdir)
const symlink = promisify(fs.symlink)

/**
 * @typedef {import('./utils/extension').Extension} Extension
 * @typedef {Object} Options
 * @property {string} url
 * @property {number} [totalRuns]
 * @property {string} [format]
 * @property {boolean} [disableGather]
 *
 * @typedef {Object} LhResult
 * @property {string} fetchTime
 * @property {Object} audits
 * @property {Object} categories
 * @property {Object} categoryGroups
 * @property {string[]} runWarnings
 * @property {string} extensionFullName
 * @property {{ total: number }} timing
 */

/**
 * Launch analysis.
 *
 * @param {string[]} extSource
 * @param {Options} opts
 * @return {Promise<LhResult[]>}
 */

exports.launch = async function(extSource, opts) {
  if (!opts.disableGather) await emptyDir(tmpDir)
  const extensions = await getExtensions(extSource)
  if (!opts.disableGather) await gatherLighthouseReports(extensions, opts)
  await setMedianResult(extensions)
  const defaultResult = await getMedianResult(getDefaultExt())
  return Promise.all(
    extensions
      .filter(ext => !isDefaultExt(ext))
      .map(async ext => {
        const lhResult = await getMedianResult(ext)
        const exthouseResult = extendResultWithExthouseCategory(ext, lhResult, defaultResult)
        await saveExthouseResult(ext, opts.format, exthouseResult)
        return exthouseResult
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
    log.info('Analyze %s (%sx times)', ext.name, totalRuns)
    for (let i = 1; i <= totalRuns; i++) {
      const startTime = Date.now()
      try {
        const { lhr } = await measureChromium(opts.url, ext)
        await saveDebugResult(ext, i, lhr)
        log.info('  %s: complete in %sms/%sms', i, Date.now() - startTime, Math.round(lhr.timing.total))
      } catch (e) {
        log.error(e)
      }
    }
  }
}

/**
 * @param {Extension[]} extensions
 * @return {Promise}
 */

async function setMedianResult(extensions) {
  const allFiles = await readdir(tmpDir)
  await Promise.all(
    extensions.map(async ext => {
      const matcher = new RegExp(`result-${normalizeExtName(ext.name)}-[-0-9]`, 'g')
      const extFiles = allFiles.filter(fileName => fileName.match(matcher))
      /** @type {{lhr: LhResult, extFile: string }[]} */
      const results = await Promise.all(
        extFiles.map(async extFile => {
          let lhr = await readFile(join(tmpDir, extFile), 'utf8')
          return {
            lhr: JSON.parse(lhr),
            extFile
          }
        })
      )
      const completeRes = results.filter(({ lhr }) => getMetricForMedian(lhr)) // filter errors
      const completeMedianValues = completeRes.map(({ lhr }) => getMetricForMedian(lhr))
      const medianIndex = indexOf(completeMedianValues, getDiscreateMedian(completeMedianValues))
      const { extFile } = completeRes[medianIndex]
      try {
        const medianFileName = `median-${extFile}`.replace(/-[-0-9]/, '')
        await symlink(extFile, join(tmpDir, medianFileName))
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error
        }
      }
    })
  )
}

/**
 * @param {Extension} ext
 * @return {Promise<LhResult>}
 */

async function getMedianResult(ext) {
  const lhr = await readFile(join(tmpDir, `median-result-${normalizeExtName(ext.name)}.json`), 'utf8')
  return JSON.parse(lhr)
}

/**
 * Use Max Potencial FID since it's mostly impacted by extensions.
 *
 * @param {LhResult} lhr
 * @return {number}
 */

function getMetricForMedian(lhr) {
  return Math.round(lhr.audits['max-potential-fid'].numericValue || 0)
}

/**
 * Basic algorithm to get discreat median from `values`.
 *
 * @param {number[]} values
 * @return {number}
 */

function getDiscreateMedian(values) {
  if (values.length === 1) return values[0]
  const sortedValues = values.concat([]).sort((a, b) => a - b)
  const half = Math.floor(values.length / 2)
  return sortedValues[half]
}

/**
 * Save debug report.
 *
 * @param {Extension} ext
 * @param {number} i
 * @param {LhResult} lhr
 */

function saveDebugResult(ext, i, lhr) {
  const reportPath = join(tmpDir, `result-${normalizeExtName(ext.name)}-${i}.json`)
  const compactLhr = { ...omit(lhr, ['i18n']), timing: { total: lhr.timing.total } }
  return writeFile(reportPath, JSON.stringify(compactLhr, null, '  '))
}

/**
 * Save `ext` output in `format`.
 *
 * @param {Extension} ext
 * @param {string} format
 * @param {LhResult} lhr
 */

async function saveExthouseResult(ext, format, lhr) {
  const report = ReportGenerator.generateReport(lhr, format)
  const path = join(process.cwd(), `exthouse-${normalizeExtName(ext.name)}-${getFilenameDate(lhr)}.${format}`)
  await writeFile(path, report)
  if (format === formats.html) await open(path)
}

/**
 * Get date based on LhResult
 *
 * @param {LhResult} lhr
 * @return {string}
 */

function getFilenameDate(lhr) {
  const date = (lhr.fetchTime && new Date(lhr.fetchTime)) || new Date()

  const timeStr = date.toLocaleTimeString('en-US', { hour12: false })
  const dateParts = date
    .toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .split('/')
  // @ts-ignore - parts exists
  dateParts.unshift(dateParts.pop())
  const dateStr = dateParts.join('-')

  const filenamePrefix = `${dateStr}_${timeStr}`
  // replace characters that are unfriendly to filenames
  return filenamePrefix.replace(/[/?<>\\:*|":]/g, '-')
}
