const { existsSync } = require('fs')

const extFolderExists = path => {
  if (!existsSync(path)) throw new Error(`Invalid path to extension folder: ${path}`)
}

const isExtPath = (extPath, extFolder) => {
  if (!extPath && !extFolder) {
    throw new Error('Error: provide a path to extension or a folder containing extensions.')
  }
}

const validateInput = (extPath, options) => {
  const { folder } = options
  if (folder) extFolderExists(folder)
  isExtPath(extPath, folder)
}

exports.validateInput = validateInput
