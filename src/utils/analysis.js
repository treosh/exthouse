const { mean: average, compact, sum, round } = require('lodash')
const { Audit } = require('lighthouse')
const simpleFormatNumber = require('simple-format-number')
const { getExtName } = require('./extension')

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
 *
 * @typedef {Object} DefaultDetails
 * @property {number} maxPotentcialFid
 * @property {{ startTime: number, duration: number }[]} longTasks
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
  const defaultAudit = getDefaultMetrics(defaultResult)
  const newLongTasks = getNewLongTasks(lhResult, defaultAudit.details)
  const maxPotentialFidChange = getMaxPotentialFidChange(lhResult, defaultAudit.details)
  const extensionExtraFiles = getExtensionExtraFiles(lhResult)
  const categoryScore = average(compact([newLongTasks.score, maxPotentialFidChange.score, extensionExtraFiles.score]))
  return {
    ...lhResult,
    extensionFullName: ext.name,
    runWarnings: lhResult.runWarnings.filter(warning => !warning.includes('Chrome extensions')),
    audits: {
      ...lhResult.audits,
      [newLongTasks.id]: newLongTasks,
      [maxPotentialFidChange.id]: maxPotentialFidChange,
      [extensionExtraFiles.id]: extensionExtraFiles,
      [defaultAudit.id]: defaultAudit
    },
    categories: {
      ...lhResult.categories,
      performance: {
        ...lhResult.categories.performance,
        title: `Extension Performance`,
        description: `These audits show the impact of "${getExtName(ext)}" extension on user experience.`,
        score: categoryScore,
        auditRefs: lhResult.categories.performance.auditRefs.concat([
          { id: maxPotentialFidChange.id, weight: 1, group: 'diagnostics' },
          { id: newLongTasks.id, weight: 1, group: 'diagnostics' },
          { id: extensionExtraFiles.id, weight: 1, group: 'diagnostics' },
          { id: defaultAudit.id, weight: 0 }
        ])
      }
    },
    categoryGroups: {
      ...lhResult.categoryGroups,
      diagnostics: {
        title: 'Diagnostics',
        description: `Use this data to discover the negative impact of the extension.`
      }
    }
  }
}

/**
 * Get data from `default` run for future analysis.
 *
 * @param {LhResult} defaultResult
 * @return {LhAuditResult}
 */

function getDefaultMetrics(defaultResult) {
  return {
    id: 'exthouse-default-metrics',
    title: 'Default data without extension.',
    description: `Use this data to compare metrics with a run without extension.`,
    score: null,
    scoreDisplayMode: 'informative',
    details: {
      maxPotentcialFid: getMaxPotencialFid(defaultResult),
      longTasks: getLongTasks(defaultResult)
    }
  }
}

/**
 * Find new long tasks from `audits["main-thread-tasks"]`.
 *
 * @param {LhResult} lhResult
 * @param {DefaultDetails} defaultDefails
 * @return {LhAuditResult}
 */

function getNewLongTasks(lhResult, defaultDefails) {
  const longTasks = getLongTasks(lhResult)
  const files = getExtensionFiles(lhResult)
  const numericValue = files.length
    ? sum(longTasks.map(task => task.duration)) - sum(defaultDefails.longTasks.map(task => task.duration))
    : 0
  const score = Audit.computeLogNormalScore(numericValue, 50, 250)
  const headings = [
    { key: 'startTime', itemType: 'text', text: 'Start Time' },
    { key: 'duration', itemType: 'text', text: 'Duration' }
  ]
  const items = longTasks.map(task => ({
    startTime: `${formatMsValue(task.startTime)} ms`,
    duration: `${formatMsValue(task.duration)} ms`
  }))
  return {
    id: 'exthouse-new-long-tasks',
    title: 'New Long Tasks',
    description: `Total value of [Long Tasks](https://developer.mozilla.org/en-US/docs/Web/API/Long_Tasks_API) added by extension.`,
    score,
    scoreDisplayMode: 'numeric',
    numericValue,
    displayValue: `${formatMsValue(numericValue)} ms`,
    details: Audit.makeTableDetails(headings, items) // FIXME: display only new tasks
  }
}

/**
 * Get the change of `audits["max-potential-fid"]`.
 *
 * @param {LhResult} lhResult
 * @param {DefaultDetails} defaultDefails
 * @return {LhAuditResult}
 */

function getMaxPotentialFidChange(lhResult, defaultDefails) {
  const maxFid = getMaxPotencialFid(lhResult)
  const numericValue = maxFid > defaultDefails.maxPotentcialFid ? maxFid - defaultDefails.maxPotentcialFid : 0
  const score = Audit.computeLogNormalScore(numericValue, 50, 250)
  return {
    id: 'exthouse-max-potential-fid-change',
    title: 'Max Potential FID Change',
    description: `The change for the longest task duration highlights the impact on potential First Input Delay. [Learn more](https://developers.google.com/web/updates/2018/05/first-input-delay).`,
    score,
    scoreDisplayMode: 'numeric',
    numericValue,
    displayValue: `${formatMsValue(numericValue)} ms`
  }
}

/**
 * Get extension files from `audits["bootup-time"]`.
 *
 * @param {LhResult} lhResult
 * @return {LhAuditResult}
 */

function getExtensionExtraFiles(lhResult) {
  const headings = lhResult.audits['bootup-time'].details.headings
  const items = getExtensionFiles(lhResult)
  const numericValue = items.length
  const score = Audit.computeLogNormalScore(numericValue, 1, 2)
  return {
    id: 'exthouse-extension-files',
    title: 'Extension Files',
    description:
      'Extension files add extra CPU consumption for every URL visit. Bundle resources into one and leverage hot chaching. [Learn more](https://v8.dev/blog/code-caching-for-devs).',
    score,
    scoreDisplayMode: 'numeric',
    numericValue,
    displayValue: `${numericValue} file${numericValue !== 1 ? 's' : ''}`,
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

/**
 * @param {LhResult} lhResult
 * @return {{ url: string, total: number, scripting: number, scriptParseCompile: number }[]}
 */

function getExtensionFiles(lhResult) {
  return lhResult.audits['bootup-time'].details.items.filter(
    /** @param {Object} item */ item => item.url.startsWith('chrome-extension')
  )
}

/**
 * Format `value` in milliseconds to a readable string.
 *
 * @param {number} value
 * @return {string}
 */

function formatMsValue(value) {
  const val = Math.round(value / 10) * 10
  const digits = Math.round(val) === val ? 0 : 1
  return simpleFormatNumber(val, { fractionDigits: digits })
}
