const { startCase } = require('lodash')
const unzipCrx = require('unzip-crx')
const { join, basename, isAbsolute } = require('path')
const { defaultName, tmpDir } = require('../config')

/**
 * @typedef {Object} Extension
 * @property {string} name
 * @property {string} nameAlias
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
      name: basename(file).replace('.crx', ''),
      nameAlias: normalizeExtName(file)
    }
  })
  await unzipExtensions(extList)
  return [exports.getDefaultExt()].concat(extList)
}

/**
 * Get well-formatted `ext` name.
 *
 * @param {Extension} ext
 * @return {string}
 */

exports.getExtName = ext => {
  const match = ext.name.match(/_v/)
  if (!match) return ext.name
  return startCase(ext.name.substr(0, match.index))
}

/**
 * Check if `ext` is default.
 *
 * @param {Extension} ext
 * @return {Boolean}
 */

exports.isDefaultExt = ext => {
  return ext.name === defaultName
}

/**
 * Get default extension.
 *
 * @return {Extension}
 */

exports.getDefaultExt = () => {
  return {
    name: defaultName,
    nameAlias: defaultName.toLowerCase()
  }
}

exports.normalizeExtName = () => {}

/**
 * @param {Extension[]} extList
 * @return {Promise}
 */

function unzipExtensions(extList) {
  return Promise.all(extList.map(ext => unzipCrx(ext.source, ext.path)))
}

/**
 *
 * @param {string} fileName
 * @return {string}
 */
function normalizeExtName(fileName) {
  let name = basename(fileName).replace('.crx', '')
  name = name.replace(/(_|-)(.*)/, '')
  name = name.toLowerCase()
  return name
}
