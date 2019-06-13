const { mean: average, compact, sum, round } = require('lodash')
const { Audit } = require('lighthouse')

/**
 * @typedef {import('./extension').Extension} Extension
 * @typedef {import('../index').LhResult} LhResult
 *
 * @typedef {Object} LhAuditResult
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number | null} score
 * @property {'informative' | 'numeric'} scoreDisplayMode
 * @property {number} [numericValue]
 * @property {string} [displayValue]
 * @property {Object} [details]
 */

/**
 * Extend `lhResult` with a new category.
 *
 * @param {Extension} ext
 * @param {LhResult} lhResult
 * @param {LhResult} defaultResult
 * @return {LhResult}
 */

exports.extendResultWithExthouseCategory = (ext, lhResult, defaultResult) => {
  const newLongTasks = getNewLongTasks(lhResult, defaultResult)
  const maxPotencialFidChange = getMaxPotencialFidChange(lhResult, defaultResult)
  const scriptingFiles = getScriptingFiles(lhResult)
  const categoryScore = average(compact([newLongTasks.score, maxPotencialFidChange.score]))
  return {
    ...lhResult,
    runWarnings: lhResult.runWarnings.filter(warning => !warning.includes('Chrome extensions')), // FIXME: should warning be excluded?
    audits: {
      ...lhResult.audits,
      [newLongTasks.id]: newLongTasks,
      [maxPotencialFidChange.id]: maxPotencialFidChange,
      [scriptingFiles.id]: scriptingFiles
    },
    categories: {
      ...lhResult.categories,
      exthouse: {
        id: 'exthouse',
        title: 'Extension Impact',
        description: `These audits highlight negative impact of the ${ext.name} extension on user experience.`,
        score: categoryScore,
        auditRefs: [
          { id: newLongTasks.id, weight: 1 },
          { id: maxPotencialFidChange.id, weight: 1 },
          { id: scriptingFiles.id, weight: 0 }
        ]
      }
    }
  }
}

/**
 * Find new long tasks from `audits["main-thread-tasks"]`.
 *
 * @param {LhResult} lhResult
 * @param {LhResult} defaultResult
 * @return {LhAuditResult}
 */

function getNewLongTasks(lhResult, defaultResult) {
  const longTasks = getLongTasks(lhResult)
  const defaultLongTasks = getLongTasks(defaultResult)
  const numericValue = sum(longTasks.map(task => task.duration)) - sum(defaultLongTasks.map(task => task.duration)) // FIXME: possibly just count tasks
  const opts = { scorePODR: 50, scoreMedian: 250 }
  const score = Audit.computeLogNormalScore(numericValue, opts.scorePODR, opts.scoreMedian)
  const headings = [
    { key: 'startTime', itemType: 'text', text: 'Task start time' },
    { key: 'duration', itemType: 'text', text: 'Duration' }
  ]
  return {
    id: 'exthouse-new-long-tasks',
    title: 'New Long Tasks',
    description:
      'Long Tasks are CPU events that block the execution for longer than 50ms. Additional tasks produced by the extension negatively impact the user experience.',
    score,
    scoreDisplayMode: 'numeric',
    numericValue,
    displayValue: `${numericValue} ms`, // FIXME: proper LH rounding of ms
    details: Audit.makeTableDetails(headings, longTasks) // FIXME: display only new tasks
  }
}

/**
 * Get the change of `audits["max-potencial-fid"]`.
 *
 * @param {LhResult} lhResult
 * @param {LhResult} defaultResult
 * @return {LhAuditResult}
 */

function getMaxPotencialFidChange(lhResult, defaultResult) {
  const maxFid = getMaxPotencialFid(lhResult)
  const maxDefaultFid = getMaxPotencialFid(defaultResult)
  const numericValue = maxFid > maxDefaultFid ? maxFid - maxDefaultFid : 0
  const opts = { scorePODR: 50, scoreMedian: 250 }
  const score = Audit.computeLogNormalScore(numericValue, opts.scorePODR, opts.scoreMedian)
  return {
    id: 'exthouse-max-potenctial-fid-change',
    title: 'Max Potencial FID change',
    description: '', // FIXME: proper descriptinon
    score,
    scoreDisplayMode: 'numeric',
    numericValue,
    displayValue: `${numericValue} ms` // FIXME: proper rounding
  }
}

/**
 * Get extension files from `audits["bootup-time"]`.
 *
 * @param {LhResult} lhResult
 * @return {LhAuditResult}
 */

function getScriptingFiles(lhResult) {
  const bootupTime = lhResult.audits['bootup-time']
  const headings = bootupTime.details.headings
  const items = bootupTime.details.items.filter(
    /** @param {Object} item */ item => item.url.startsWith('chrome-extension')
  )
  // FIXME: return notApplicable when no items
  return {
    id: 'exthouse-scripting',
    title: 'New scripting files',
    description: '', // FIXME
    score: null,
    scoreDisplayMode: 'informative',
    numericValue: 1,
    displayValue: `${items.length} file${items.length !== 1 ? 's' : ''}`,
    details: Audit.makeTableDetails(headings, items)
  }
}

/**
 * @param {LhResult} lhResult
 * @return {{ startTime: number, duration:number }[]}
 */

function getLongTasks(lhResult) {
  return lhResult.audits['main-thread-tasks'].details.items.filter(
    /** @param {Object} task */ task => task.duration >= 50
  )
}

/**
 * @param {LhResult} lhResult
 * @return {number}
 */

function getMaxPotencialFid(lhResult) {
  return round((lhResult.audits['max-potential-fid'] || {}).numericValue || 0)
}
