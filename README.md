# Exthouse

> Analyze impact of browser extension on web performance.

<img width="1116" alt="Screenshot of "Grammarly" extension performance report" src="https://user-images.githubusercontent.com/158189/59514028-5904e680-8ebc-11e9-9e3f-bb6c9f8b464e.png">

## Install

Install CLI using `npm`:

```bash

$ npm install --global exthouse
$ exthouse Grammarly-for-Chrome.crx --runs=3
```

## Motivation

Often, measuring real user performance engineers take to the account factors, like: device,  network conditions. 
But here are more factors in real user monitoring. One of them - web extensions. They can add additional scripts to process, DOM manipulations and other. It was beyond developers control for a while. 

Exthouse - tool, powered by [Lighthouse](https://github.com/GoogleChrome/lighthouse), provides with report (Lighthouse style 😎) about impact on user performance by calculating all additional work extension added to the browser.

## How it works

### High-level process:

- runs website in 2 modes (without any extension, and with installed extension), median run is selected to avoid local issues with local environment
- uses Lighthouse to evaluate performance
- compares results and defines recommendations

### What are the environment conditions?

- Extensions installed and sites are opened using [Puppeteer](https://github.com/GoogleChrome/puppeteer) and Chromium browser.
- Lighthouse run with: `throttlingMethod: devtools`, `emulatedFormFactor: 'desktop'`. `cpuSlowdownMultiplier: 2`. More settings in [config](/src/utils/measure-chromium.js#L7). 

### What performance metrics does Exthouse measure?

- Time to interactive (TTI) - Time to interactive is the amount of time it takes for the page to become fully interactive. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/time-to-interactive).
- First input delay (FID) - The change for the longest task duration highlights the impact on potential First Input Delay. [Learn more](https://developers.google.com/web/updates/2018/05/first-input-delay).

### How are the scores weighted?

It's based on [Lighthouse scoring algorithm](https://github.com/GoogleChrome/lighthouse/blob/master/docs/scoring.md#how-are-the-scores-weighted).

Exthouse adds extra audits to calculate performance score:

- `exthouse-new-long-tasks` - The value represents a sum of Long Tasks. [Long Tasks](https://developer.mozilla.org/en-US/docs/Web/API/Long_Tasks_API) (weight: 1).
- `exthouse-max-potential-fid-change` - The change for the longest task duration highlights the impact on potential First Input Delay (weight: 1).
- `exthouse-extension-files` - Extension files add extra CPU consumption for every URL visit. Bundle resources into one and leverage hot chaching. [Learn more](https://v8.dev/blog/code-caching-for-devs) (weight: 1).
- `exthouse-default-metrics` - All metrics collected from the default run (without extension) (weight: 0).

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
