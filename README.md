# Web Extensions Performance Analyzer

Analyze extensions impact on loading performance. CLI and node.

<img align="center" alt="Web Extensions performance analyzer logo" src="https://user-images.githubusercontent.com/6231516/57575027-796bfc00-744b-11e9-80ce-282a97b6d699.png">

## Quick Start

```sh
npx @treosh/ext-perf --url=https://treo.sh
```

*([npx](https://medium.com/@maybekatz/introducing-npx-an-npm-package-runner-55f7d4bd282b) comes with npm 5.2+ and higher)*

## Installation

Install CLI using `npm`:
```bash
$ npm install --global @treosh/ext-perf
```

or via `yarn`:
```bash
$ yarn global add @treosh/ext-perf
```

## Usage:

```bash
ext-perf [--help] [<command>]
```

**`$ ext-perf <extSourceDir>`**

```
Options:
  --url          URL to measure performance impact               [string] [default: false]
  --json         Print result inot console                       [boolean] [default: false]
  --browserType  Browser type to test in. Available: chrome, ff  [string] [default: chrome]
```

> Note: In case <extSourceDir> wasn't passed, preset of extensions will be used 

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
- put it into `extensions` folder
- add new property to `extensions.js`

For Firefox extensions:

- open Firefox addons page (e.g. https://addons.mozilla.org/en-US/firefox/addon/grammarly-1/)
- right click on add button and save-as into `extensions/ff` folder 
(original answer - https://support.mozilla.org/en-US/questions/1112553)


Inspired by: https://twitter.com/denar90_/status/1065712688037277696
