// @ts-nocheck
const webExt = require('web-ext').default
const getPort = require('get-port')
const PP_FF = require('puppeteer-firefox')

/**
 * @typedef {import('../index').Extension} Extension
 *
 * @param {string} url
 * @param {Extension} ext
 * @return {Promise<{ lhr: {audits: Object} }>}
 */

exports.measureFirefox = async function(url, ext) {
  let extensionRunners
  let browser

  if (ext.path) {
    // @todo wait for https://github.com/sindresorhus/get-port/pull/28 and than use range for 6000 port
    const CDPPort = await getPort()

    extensionRunners = await webExt.cmd.run(
      {
        sourceDir: ext.path,
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
  if (ext.path) await page.waitFor(11000) // await extension to be installed

  // throttle since Firefox can't do that, yet
  await page.goto(url, {
    waitUntil: ['load']
  })
  const result = await page.evaluate(() => {
    return performance.now() // eslint-disable-line
  })
  if (ext.path) extensionRunners.exit()
  await browser.close()

  return {
    lhr: {
      userAgent: '',
      environment: {},
      requestedUrl: url,
      finalUrl: url,
      fetchTime: new Date().toJSON(),
      audits: {
        load: {
          id: 'load',
          title: 'On load',
          score: null,
          scoreDisplayMode: 'numeric',
          numericValue: result,
          displayValue: null
        },
        'max-potential-fid': {
          id: 'max-potential-fid',
          title: 'Max Potential First Input Delay',
          description:
            'The maximum potential First Input Delay that your users could experience is the duration, in milliseconds, of the longest task. [Learn more](https://developers.google.com/web/updates/2018/05/first-input-delay).',
          score: null,
          scoreDisplayMode: 'numeric',
          numericValue: null,
          displayValue: ''
        }
      }
    }
  }
}
