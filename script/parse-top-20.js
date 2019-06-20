// exthouse ./extensions/top-20/ --runs=5 --format=json
// usage: node script/parse-top-20.js
// parse top-20 results in markdown table

const { orderBy, find } = require('lodash')
const { join } = require('path')
const table = require('markdown-table')
const millify = require('millify')
const { readFileSync, readdirSync } = require('fs')
const { normalizeExtName } = require('../src/utils/extension')

const rankRes = JSON.parse(readFileSync(join(process.cwd(), 'extensions/top-20-rank-info.json'), 'utf8'))
const resultFileNames = readdirSync(process.cwd()).filter(fileName => fileName.startsWith('exthouse-'))

/** @type {{ name: string, score: number }[]} */
const metrics = resultFileNames.map(resultFileName => {
  console.log(resultFileName)
  const lhr = JSON.parse(readFileSync(join(process.cwd(), resultFileName), 'utf8'))
  const score = Math.round(100 * lhr.categories.performance.score)
  const extInfo = find(rankRes, res => {
    return normalizeExtName(res.name).replace(/\s+/g, '-') === lhr.extensionFullName
  })

  const fidChange = lhr.audits['exthouse-max-potential-fid-change'].numericValue

  return {
    name: extInfo.name,
    score,
    fidChange: fidChange > 50 ? fidChange : 0,
    userCount: millify(extInfo.user_count)
  }
})

const orederedMetrics = orderBy(metrics, metric => metric.score)
console.log(
  table([
    ['Name', 'Score', 'Users Count', 'FID Δ ( ms )'],
    // @ts-ignore
    ...orederedMetrics.map(metric => [metric.name, metric.score, metric.userCount, metric.fidChange])
  ])
)
