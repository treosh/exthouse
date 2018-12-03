const { resolve } = require('path')
const unzip = require('unzip-crx')

const PATH_TO_EXTENSIONS = resolve(__dirname, '../extensions/')
const TMP_FOLDER = resolve(__dirname, '../tmp')



const unzipAll = async function(extensions) {
  const unzipCrx = (path, destinationPath) => {
    return (async () => {
      await unzip(path, destinationPath)
    })()
  }

  const unzipAllCrx = extensions.reduce((acc = [], ext) => {
    const extPath = resolve(PATH_TO_EXTENSIONS, ext.source)
    const destinationPath = resolve(TMP_FOLDER, ext.name)
    acc.push(unzipCrx(extPath, destinationPath))
    return acc
  }, [])

  await Promise.all(unzipAllCrx);
}

exports.unzipAll = unzipAll;
