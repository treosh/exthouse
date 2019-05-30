const chalk = require('chalk').default
const { format } = require('util')

/** @param {string} text @param {any[]} args */
exports.info = (text, ...args) => console.error(chalk.gray(format(text, ...args)))

/** @param {string} text @param {any[]} args */
exports.debug = (text, ...args) => console.error(chalk.grey(format(text, ...args)))

/** @param {string} text @param {any[]} args */
exports.error = (text, ...args) => console.error(chalk.red(format(text, ...args)))
