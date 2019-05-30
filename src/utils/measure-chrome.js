const puppeteer = require('puppeteer')
const lighthouse = require('lighthouse')
const { URL } = require('url')

const lhConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance']
  }
}

/**
 * @param {{ url: string, extPath: string }} opts
 * @return {Promise<{ tti: number, lhr: Object }>}
 */

exports.measureChrome = async function({ url, extPath }) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: extPath ? [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`] : []
  })
  const page = await browser.newPage()
  if (extPath) await page.waitFor(11000) // await extension to be installed

  const lhFlags = {
    port: new URL(browser.wsEndpoint()).port,
    output: 'json'
  }

  const { lhr } = await lighthouse(url, lhFlags, lhConfig)
  const tti = Math.round(lhr.audits.interactive.numericValue || 0)

  await browser.close()

  return { tti, lhr }
}
