const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse')
const delay = require('delay')
const { URL } = require('url')
const { defaultName } = require('../config')

const lhConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance']
  }
}

/**
 * @typedef {import('../index').Extension} Extension
 *
 * @param {string} url
 * @param {Extension} ext
 * @return {Promise<{ lhr: {audits: Object} }>}
 */

exports.measureChromium = async function(url, ext) {
  const isDefault = ext.name === defaultName
  const browser = await puppeteer.launch({
    headless: isDefault,
    args: isDefault ? [] : [`--disable-extensions-except=${ext.path}`, `--load-extension=${ext.path}`]
  })
  if (!isDefault) await delay(10000) // await extension to be installed

  const lhFlags = {
    port: new URL(browser.wsEndpoint()).port,
    output: 'json'
  }

  const { lhr } = await lighthouse(url, lhFlags, lhConfig)

  await browser.close()

  return { lhr }
}
