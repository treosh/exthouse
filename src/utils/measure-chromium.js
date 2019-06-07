const chromeLauncher = require('chrome-launcher')
const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse')
const perfConfig = require('lighthouse/lighthouse-core/config/perf-config')
const request = require('request')
const { promisify } = require('util')
const delay = require('delay')
const { defaultName, defaultCacheType, cacheType } = require('../config')

/**
 * @typedef {import('../index').Extension} Extension
 *
 * @param {string} url
 * @param {Extension} ext
 * @param {string} [cache]
 * @return {Promise<{ lhr: {audits: Object} }>}
 */

exports.measureChromium = async function(url, ext, cache = defaultCacheType) {
  const isDefault = ext.name === defaultName
  const opts = {
    output: 'json'
  }

  // Launch chrome using chrome-launcher.
  const chrome = await chromeLauncher.launch({
    ...opts,
    chromeFlags: isDefault ? [] : [`--disable-extensions-except=${ext.path}`, `--load-extension=${ext.path}`]
  })
  const lhOpts = {
    ...opts,
    port: chrome.port,
    emulatedFormFactor: 'desktop',
    disableStorageReset: cache !== defaultCacheType
  }

  if (!isDefault) await delay(10000) // await extension to be installed

  // Connect to it using puppeteer.connect().
  const resp = await promisify(request)(`http://localhost:${lhOpts.port}/json/version`)
  const { webSocketDebuggerUrl } = JSON.parse(resp.body)
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl })

  if (cache === cacheType.warm) {
    await lighthouse(url, lhOpts, perfConfig)
  } else if (cache === cacheType.hot) {
    await lighthouse(url, lhOpts, perfConfig)
    await lighthouse(url, lhOpts, perfConfig)
  }

  // Run Lighthouse.
  const { lhr } = await lighthouse(url, lhOpts, perfConfig)

  await browser.disconnect()
  await chrome.kill()

  return { lhr }
}
