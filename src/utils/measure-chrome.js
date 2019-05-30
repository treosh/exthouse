const { readFileSync } = require('fs')
const { join } = require('path')
const puppeteer = require('puppeteer')
const delay = require('delay')
const { defaultName } = require('../config')

// tti polyfill

const ttiSrc = readFileSync(join(__dirname, '../../node_modules/tti-polyfill/tti-polyfill.js'), 'utf8')
const longTasksSrc = `
!function(){if('PerformanceLongTaskTiming' in window){var g=window.__tti={e:[]};
g.o=new PerformanceObserver(function(l){g.e=g.e.concat(l.getEntries())});
g.o.observe({entryTypes:['longtask']})}}();`

/**
 * @typedef {import('../index').Extension} Extension
 *
 * @param {string} url
 * @param {Extension} ext
 * @return {Promise<{ tti: number, longTasks: number[] }>}
 */

exports.measureChrome = async function(url, ext) {
  const isDefault = ext.name === defaultName
  const browser = await puppeteer.launch({
    headless: isDefault,
    args: isDefault ? [] : [`--disable-extensions-except=${ext.path}`, `--load-extension=${ext.path}`]
  })

  if (!isDefault) await delay(10000) // wait extension to be installed
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(longTasksSrc)
  await page.evaluateOnNewDocument(ttiSrc)
  await page.goto(url)

  const tti = Math.round(await page.evaluate(() => window.ttiPolyfill.getFirstConsistentlyInteractive()))
  const longTasks = await page.evaluate(() => window.__tti.e.map(t => t.duration))

  await browser.close()

  return { tti, longTasks }
}
