const eol = require('os').EOL
const inRange = require('in-range')
const wunderbar = require('@gribnoysup/wunderbar')
const { quantile: percentile } = require('simple-statistics')

/**
 * @typedef {import('../index').Result} Result
 *
 * @param {Result[]} results
 * @param {{ width: number, xlabel: string, xmin: number, xmax: number, lmargin: number }} options
 */

exports.drawChart = (results, options) => {
  const data = results.slice(0)
  data.sort(function(a, b) {
    return a.tti - b.tti
  })

  const { lmargin, width, xlabel, xmin, xmax } = options

  const normalizedData = data.map(value => {
    const { tti, ttiValues, name } = value
    const p100 = percentile(ttiValues, 1)
    const p50 = percentile(ttiValues, 0.65)
    const p10 = percentile(ttiValues, 0.4)
    const p0 = percentile(ttiValues, 0)
    let color

    if (inRange(tti, { start: p100, end: p50 })) {
      color = 'red'
    } else if (inRange(tti, { start: p10, end: p50 })) {
      color = 'yellow'
    } else if (inRange(tti, { end: p0 })) {
      color = 'green'
    }

    return {
      value: tti,
      label: name,
      color
    }
  })

  const { __raw } = wunderbar(normalizedData, { min: xmin, max: xmax, length: width, format: '0,000' })
  const { normalizedValues, minValueFormatted, maxValueFormatted } = __raw

  const yAxis = '│'
  const xAxis = '─'
  const corner = '╰'

  const padding = ' '.repeat(lmargin)

  const chart = normalizedValues
    .reverse()
    // @ts-ignore
    .map(value => {
      const pad = lmargin - value.label.length
      const paddedLabel = ' '.repeat(pad > 0 ? pad : 0) + value.label

      return `${paddedLabel} ${yAxis}${value.coloredChartBar} ${value.formattedValue}`
    })
    .join(`${eol}${padding} ${yAxis}${eol}`)

  const chartTop = `${padding} ${yAxis}`
  const chartBottom = `${padding} ${corner}${xAxis.repeat(width)}`
  const labelPadding = ' '.repeat(Math.max(0, (width - xlabel.length - 2) / 2))
  const chartScale = `${padding}  ${minValueFormatted}${labelPadding}${xlabel}${labelPadding}${maxValueFormatted}`

  console.log('')
  console.log([chartTop, chart, chartBottom, chartScale].join(eol))
  console.log('')
}
