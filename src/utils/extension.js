const unzipCrx = require('unzip-crx')
const { join, basename, isAbsolute } = require('path')
const { defaultName, tmpDir } = require('../config')

/**
 * @typedef {Object} Extension
 * @property {string} name
 * @property {string} [source]
 * @property {string} [path]
 */

/**
 * @param {string[]} extSource
 * @return {Promise<Extension[]>}
 */

exports.getExtensions = async extSource => {
  const files = extSource.filter(file => file.endsWith('.crx'))
  if (!files.length) throw new Error('no extensions found')
  const extList = files.map(file => {
    return {
      source: isAbsolute(file) ? file : (process.cwd(), file),
      path: join(tmpDir, basename(file)),
      name: basename(file).replace('.crx', '')
    }
  })
  await unzipExtensions(extList)
  return [getDefaultExt()].concat(extList)
}

/**
 * Check  if `ext` is default.
 *
 * @param {Extension} ext
 * @return {Boolean}
 */

exports.isDefaultExt = ext => {
  return ext.name === defaultName
}

/**
 * @param {Extension[]} extList
 * @return {Promise}
 */

function unzipExtensions(extList) {
  return Promise.all(extList.map(ext => unzipCrx(ext.source, ext.path)))
}

/**
 * Get default extension.
 *
 * @return {Extension}
 */

function getDefaultExt() {
  return { name: defaultName }
}
