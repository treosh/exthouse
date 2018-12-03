const { resolve } = require('path')
const unzip = require('unzip-crx')
const { extensions } = require('../extensions/extensions')

const pathToExtensions = '../extensions/';

const unzipCrx = (path, pathTo) => {
  return (async () => {
    await unzip(path, resolve(__dirname, '../tmp', pathTo))
  })()
}

const unzipAll = Object.entries(extensions).reduce((acc = [], [extKey, extName]) => {
  const extPath = resolve(__dirname, pathToExtensions, extName)
  acc.push(unzipCrx(extPath, extKey))
  return acc
}, [])

exports.unzipAll = unzipAll;
