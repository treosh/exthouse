const { join } = require('path')
const chalk = require('chalk')
const unzip = require('unzip-crx')
const { extensionsDir, tmpDir } = require('./settings')

exports.unzipExtensions = ({ extensions, browserType }) => {
  return Promise.all(
    extensions.map(ext => {
      const extPath = join(extensionsDir, browserType, ext.source)
      const destinationPath = join(tmpDir, browserType, ext.name)
      return unzip(extPath, destinationPath)
    })
  )
}

exports.log = (text, color = 'gray') => {
  console.log(chalk` {${color} ${text}} `)
}