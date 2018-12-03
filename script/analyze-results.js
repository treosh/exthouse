const { sortBy } = require('lodash')
const fs = require('fs')
const { join } = require('path')

const pageName = 'bbc'
const dir = join(__dirname, '../results', pageName)
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
  console.log('%s: %s %j', ext, sortedTtis[2], sortedTtis)  
}

// https://www.booking.com/index.en-gb.html
// 
// grammarly: 6622 [6372,6434,6622,6777,6899]
// honey: 6572 [6243,6470,6572,6575,6686]
// adblock: 6406 [6110,6279,6406,6483,6636]
// adblock-plus: 6368 [6288,6296,6368,6495,6536]
// turn-of-the-light: 6347 [6246,6319,6347,6469,7171]
// evernote-web-clipper: 6205 [6112,6168,6205,6279,6626]
// default: 6150 [6049,6109,6150,6430,6494]

// https://www.bbc.com/news
//
// turn-of-the-light: 10339 [9155,9329,10339,11640,11685]
// honey: 10265 [9819,9887,10265,10808,11245]
// grammarly: 9585 [9446,9468,9585,10011,10153]
// default: 9430 [9118,9272,9430,9830,9852]
// evernote-web-clipper: 9422 [9325,9366,9422,9629,10014]
// adblock: 8997 [8982,8987,8997,9016,9026]
// adblock-plus: 8991 [8856,8967,8991,9040,9137]