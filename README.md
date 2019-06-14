# Exthouse

> Analyze impact of browser extension on web performance.

<img width="1116" alt="Screenshot 2019-06-14 at 15 26 35" src="https://user-images.githubusercontent.com/158189/59514028-5904e680-8ebc-11e9-9e3f-bb6c9f8b464e.png">

## Install

Install CLI using `npm`:

```bash

$ npm install --global exthouse
$ exthouse Grammarly-for-Chrome.crx --runs=3
```

## How it works

High-level process:

- runs website in 2 modes (without any extension, and with installed extension), median run is selected to avoid local issues with local environment
- uses Lighthouse to evaluate performance
- compare results and defines recommendations

What's typically affected by web extension?

- new scripts takes cpu time, which often reflects on a long CPU blockage - Long Tasks
- Long Tasks effect TTI and FID

Extra audits:

- `exthouse-new-long-tasks` - The value represents a sum of [Long Tasks](https://developer.mozilla.org/en-US/docs/Web/API/Long_Tasks_API) added by extension.
- `exthouse-max-potential-fid-change` - The change for the longest task duration highlights the impact on potential First Input Delay. [Learn more](https://developers.google.com/web/updates/2018/05/first-input-delay).
- `exthouse-extension-files` - Extension files add extra CPU consumption for every URL visit. Bundle resources into one and leverage hot chaching. [Learn more](https://v8.dev/blog/code-caching-for-devs).
- `exthouse-default-metrics` - All metrics collected from the default run (without extension).

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
