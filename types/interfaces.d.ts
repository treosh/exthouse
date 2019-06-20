declare module 'lighthouse'
declare module 'lighthouse/lighthouse-core/report/report-generator'
declare module 'unzip-crx'
declare module 'markdown-table'
declare module 'millify'

declare module 'simple-format-number' {
  function simplerFormatNumber(value: number, opts: { fractionDigits?: number }): string
  export = simplerFormatNumber
}
