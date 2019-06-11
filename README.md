# Exthouse: Browser Extensions Performance Analyzer

Analyze extensions impact on loading performance. CLI and node.

## Quick Start

```sh
npx @treosh/exthouse <extSourceDir>
```

_([npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) comes with npm 5.2+ and higher)_

## Installation

Install CLI using `npm`:

```bash
$ npm install --global @treosh/exthouse
```

or via `yarn`:

```bash
$ yarn global add @treosh/exthouse
```

## Usage:

```bash
exthouse [--help] [<command>]
```

**`$ exthouse <extSourceDir>`**

```
Options:
  --runs <number>    amount of runs to evaluate median performance value (default: "5")
  --url <url>        url to evaluate extension performance (default: "https://example.com/")
  --format <format>  output format options: [json] (default: "json")
  --debug            debugging
  -V, --version      output the version number
  -h, --help         output usage information
```

### Extensions Preset

- AdBlock
- Grammarly-for-Chrome
- Evernote-Web-Clipper
- Ghostery-Privacy-Ad-Blocker
- Honey
- LastPass-Free-Password-Manager

### Development

For Chrome extensions:

- download extension using https://chrome-extension-downloader.com/
- copy path to the `MY_EXTENTION.crx` and use cli

For Firefox extensions (experimental):

- open Firefox addons page (e.g. https://addons.mozilla.org/en-US/firefox/addon/grammarly-1/)
- right click on add button and save-as into `extensions/ff` folder
  (original answer - https://support.mozilla.org/en-US/questions/1112553)

Inspired by: https://twitter.com/denar90_/status/1065712688037277696
