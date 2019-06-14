# Exthouse

> Analyze impact of browser extension on web performance.

<img width="1116" alt="Screenshot 2019-06-14 at 15 26 35" src="https://user-images.githubusercontent.com/158189/59514028-5904e680-8ebc-11e9-9e3f-bb6c9f8b464e.png">

## Install

Install CLI using `npm`:

```bash

$ npm install --global exthouse
$ exthouse Grammarly-for-Chrome.crx --runs=3
```

## Usage

```bash
exthouse [path/to/extension.crx] [options]
```

**`$ exthouse --help`**

```
Options:
  --runs <number>    amount of runs to evaluate median performance value (default: "1")
  --url <url>        url to evaluate extension performance (default: "https://example.com/")
  --format <format>  output format options: [json,html] (default: "html")
  --disableGather    disable gathering and use /exthouse to produce results
  -V, --version      output the version number
  -h, --help         output usage information
```

## Evaluate any extension

1. Download extension using https://chrome-extension-downloader.com/
2. Copy path to the `MY_EXTENTION.crx` and pass to cli `exthouse MY_EXTENTION.crx --runs=3`
3. The process takes a few minutes and result are stored in the [Lighthouse](https://github.com/GoogleChrome/lighthouse) report.
4. All debug data is stored in `exthouse` folder.

## Credits

Inspired by https://twitter.com/denar90_/status/1065712688037277696

Sponsored by [Treo.sh - Page speed monitoring made easy](https://treo.sh).

[![](https://travis-ci.org/treosh/exthouse.png)](https://travis-ci.org/treosh/exthouse)
[![](https://img.shields.io/npm/v/exthouse.svg)](https://npmjs.org/package/exthouse)
[![](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
