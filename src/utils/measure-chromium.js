const chromeLauncher = require('chrome-launcher')
const lighthouse = require('lighthouse')
const delay = require('delay')
const { defaultName, defaultCacheType, cacheType, defaultAudits } = require('../config')

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
  const lhrConfig = {
    extends: 'lighthouse:default',
    settings: {
      throttlingMethod: 'devtools',
      onlyAudits: defaultAudits
    }
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

  if (cache === cacheType.warm) {
    await lighthouse(url, lhOpts, lhrConfig)
  } else if (cache === cacheType.hot) {
    await lighthouse(url, lhOpts, lhrConfig)
    await lighthouse(url, lhOpts, lhrConfig)
  }

  // Run Lighthouse.
  const { lhr } = await lighthouse(url, lhOpts, lhrConfig)
  await chrome.kill()

  return { lhr }
}
