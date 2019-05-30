// @ts-nocheck
const { join, basename } = require('path')
const chalk = require('chalk')
const eol = require('os').EOL
const unzip = require('unzip-crx')
const inRange = require('in-range')
const wunderbar = require('@gribnoysup/wunderbar')
const percentile = require('percentile')
const { tmpDir, browsers } = require('./settings')

/**
 * @param {string} text
 * @param {string} color
 */

const log = (text, color = 'gray') => {
  console.log(chalk` {${color} ${text}} `)
}

/**
 * @param {string} extSource
 */

const getExtensions = async extSource => {
  const files = [extSource]
  log('Extensions:', 'green')
  return files.map(file => {
    log(file, 'yellow')
    return {
      source: file,
      name: basename(file)
    }
  })
}

/**
 * @param {{ extensions: Array<string>, browserType: string }} opts
 */

exports.unzipExtensions = ({ extensions, browserType }) => {
  return Promise.all(
    extensions.map(ext => {
      const destinationPath = join(tmpDir, browserType, ext.name)
      return unzip(ext.source, destinationPath)
    })
  )
}

exports.log = log

exports.drawChart = (results, options) => {
  const data = results.slice(0)
  data.sort(function(a, b) {
    return a.tti - b.tti
  })

  const { lmargin, width, xlabel, xmin, xmax } = options

  const normalizedData = data.map(value => {
    const { tti, name } = value
    const percentile100 = percentile(100, data, item => item.tti)
    const percentile65 = percentile(65, data, item => item.tti)
    const percentile40 = percentile(40, data, item => item.tti)
    const percentile20 = percentile(20, data, item => item.tti)
    let color

    if (inRange(tti, { start: percentile100.tti, end: percentile65.tti })) {
      color = 'red'
    } else if (inRange(tti, { start: percentile40.tti, end: percentile65.tti })) {
      color = '#ff8300'
    } else if (inRange(tti, { end: percentile20.tti })) {
      color = 'green'
    }

    return {
      value: tti,
      label: name,
      color
    }
  })

  const { __raw } = wunderbar(normalizedData, {
    min: xmin,
    max: xmax,
    length: width,
    format: '0,000'
  })

  const { normalizedValues, minValueFormatted, maxValueFormatted } = __raw

  const yAxis = '│'
  const xAxis = '─'
  const corner = '╰'

  const padding = ' '.repeat(lmargin)

  const chart = normalizedValues
    .reverse()
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

exports.getExtensions = getExtensions

exports.getExtensionsFromFolder = async (extSourceDir, type) => {
  const extType = {
    [browsers.CHROME]: 'crx',
    [browsers.FIREFOX]: 'xpi'
  }
  return await getExtensions(`${extSourceDir}/**/*.${extType[type]}`)
}
