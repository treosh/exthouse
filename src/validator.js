const { existsSync } = require('fs')

/**
 * @param {string} path
 */

const extFolderExists = path => {
  if (!existsSync(path)) throw new Error(`Invalid path to extension folder: ${path}`)
}

/**
 * @param {string} extPath
 * @param {string} extFolder
 */

const isExtPath = (extPath, extFolder) => {
  if (!extPath && !extFolder) {
    throw new Error('Error: provide a path to extension or a folder containing extensions.')
  }
}

/**
 * @param {string} extPath
 * @param {Object} options
 */

const validateInput = (extPath, options) => {
  const { folder } = options
  if (folder) extFolderExists(folder)
  isExtPath(extPath, folder)
}

exports.validateInput = validateInput
