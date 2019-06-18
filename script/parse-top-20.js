// usage: node script/parse-top-20.js
// parse top-20 results in markdown table

const { orderBy } = require('lodash')
const { join } = require('path')
const table = require('markdown-table')
const fs = require('fs')

const resultFileNames = fs.readdirSync(process.cwd()).filter(fileName => fileName.startsWith('exthouse-'))

/** @type {{ name: string, score: number }[]} */
const metrics = resultFileNames.map(resultFileName => {
  const lhr = JSON.parse(fs.readFileSync(join(process.cwd(), resultFileName), 'utf8'))
  const score = Math.round(100 * lhr.categories.performance.score)
  return { name: lhr.extensionFullName, score }
})

const orederedMetrics = orderBy(metrics, metric => metric.score)
console.log(table([['Name', 'Score'], ...orederedMetrics.map(metric => [metric.name, metric.score])]))
