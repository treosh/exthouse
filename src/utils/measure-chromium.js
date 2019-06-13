const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse')
const delay = require('delay')
const { defaultName, defaultCacheType, cacheType } = require('../config')

const lhrConfig = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools', // Lantern does not support warm/hot caching
    emulatedFormFactor: 'desktop', // It's not possible to install extension on mobile
    output: 'json',
    onlyAudits: [
      'screenshot-thumbnails',
      'max-potential-fid',
      'interactive',
      'mainthread-work-breakdown',
      'bootup-time',
      'network-requests',
      'main-thread-tasks',
      'resource-summary'
    ]
  }
}

/**
 * @typedef {import('../index').Extension} Extension
 * @typedef {import('../index').LhResult} LhResult
 *
 * @param {string} url
 * @param {Extension} ext
 * @param {string} [cache]
 * @return {Promise<{ lhr: LhResult }>}
 */

exports.measureChromium = async function(url, ext, cache = defaultCacheType) {
  const isDefault = ext.name === defaultName
  const browser = await puppeteer.launch({
    headless: isDefault, // headless mode is not possible for extensions
    args: isDefault ? [] : [`--disable-extensions-except=${ext.path}`, `--load-extension=${ext.path}`]
  })
  const lhOpts = {
    port: new URL(browser.wsEndpoint()).port,
    disableStorageReset: cache !== defaultCacheType
  }
  if (!isDefault) await delay(10000) // await extension to be installed

  if (cache === cacheType.warm) {
    await lighthouse(url, lhOpts, lhrConfig)
  } else if (cache === cacheType.hot) {
    await lighthouse(url, lhOpts, lhrConfig)
    await lighthouse(url, lhOpts, lhrConfig)
  }

  const { lhr } = await lighthouse(url, lhOpts, lhrConfig)
  await browser.close()

  return { lhr }
}
