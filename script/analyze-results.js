const { sortBy } = require('lodash')
const { median } = require('simple-statistics')
const fs = require('fs')
const { join } = require('path')

const dir = join(__dirname, '../results')
const extensions = fs.readdirSync(dir)

for (const ext of extensions) {
  const resultFiles = fs.readdirSync(join(dir, ext))
  const ttis = []
  for (const resultFile of resultFiles) {
    const result = JSON.parse(fs.readFileSync(join(dir, ext, resultFile), 'utf8'))
    const tti = Math.round(result.audits['interactive'].rawValue)
    ttis.push(tti)
  }
  const sortedTtis = sortBy(ttis)
  console.log('%s: %s %j', ext, median(sortedTtis), sortedTtis)
}
