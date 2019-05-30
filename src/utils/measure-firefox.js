// @ts-nocheck
const webExt = require('web-ext').default
const getPort = require('get-port')
const PP_FF = require('puppeteer-firefox')

/**
 * @param {{ extName: string, url: string, extPath: string }} opts
 * @return {Promise<Object>}
 */

exports.measureFirefox = async function({ extName, url, extPath }) {
  let extensionRunners
  let browser

  if (extPath) {
    // @todo wait for https://github.com/sindresorhus/get-port/pull/28 and than use range for 6000 port
    const CDPPort = await getPort()

    extensionRunners = await webExt.cmd.run(
      {
        sourceDir: extPath,
        // comment if connect to default FF
        firefox: PP_FF.executablePath(),
        args: [`-juggler=${CDPPort}`]
      },
      {
        // These are non CLI related options for each function.
        // You need to specify this one so that your NodeJS application
        // can continue running after web-ext is finished.
        shouldExitProgram: false
      }
    )

    const browserWSEndpoint = `ws://127.0.0.1:${CDPPort}`
    browser = await PP_FF.connect({
      browserWSEndpoint
    })
  } else {
    browser = await PP_FF.launch({
      headless: false
    })
  }

  const page = await browser.newPage()
  if (extPath) await page.waitFor(11000) // await extension to be installed

  // throttle since Firefox can't do that, yet
  await page.goto(url, {
    waitUntil: ['load']
  })
  const result = await page.evaluate(() => {
    return performance.now() // eslint-disable-line
  })
  if (extPath) extensionRunners.exit()
  await browser.close()

  return {
    name: extName,
    tti: result,
    lhr: {}
  }
}
