# Analyze extensions impact on loading performance

Inspired by: https://twitter.com/denar90_/status/1065712688037277696

## Methodology

- Select a group of URLs to test:
  - https://www.booking.com/index.en-gb.html
  - https://www.bbc.com/news
- Select a group of extensions to test:
  - [Grammarly for Chrome](https://chrome.google.com/webstore/detail/grammarly-for-chrome/kbfnbcaeplbcioakkpcpgfkobkghlhen)
  - [Evernote Web Clipper](https://chrome.google.com/webstore/detail/evernote-web-clipper/pioclpoplcdbaefihamjohnefbikjilc)
  - [Honey](https://chrome.google.com/webstore/detail/honey/bmnlcjabgnpnenekpadlanbbkooimhnj)
  - [LastPass](https://chrome.google.com/webstore/detail/lastpass-free-password-ma/hdokiejnpimakedhajhdlcegeplioahd)
  - [Google Keep](https://chrome.google.com/webstore/detail/google-keep-chrome-extens/lpcaedmchfhocbbapmcbpinfpgnhiddi)
- Select a testing environment:
  - Chrome Canary with one installed extensions at a time, including logging in
  - Audits tab, Lighthouse v4 beta, only performance, Simulated Slow 4G (maybe applied?)
  - execute audit 5 times on each url (maybe 9)
  - analyze results using: `script/analyze-results.js`
  - use TTI and median (maybe parse/compile?)
  - remove extension

## Current results

```
Default (no extension):
TTI: 4780ms
TTI: 4274ms
TTI: 4358ms
TTI: 3977ms
TTI: 4049ms
TTI (median of 5): 4274ms

Grammarly:
TTI: 4806ms
TTI: 4747ms
TTI: 4646ms
TTI: 4861ms
TTI: 4942ms
TTI (median of 5): 4806ms

AdBlock:
TTI: 4505ms
TTI: 4534ms
TTI: 4048ms
TTI: 4142ms
TTI: 4184ms
TTI (median of 5): 4184ms
```

## Manual results

- https://www.booking.com/index.en-gb.html

```
grammarly: 6622 [6372,6434,6622,6777,6899]
honey: 6572 [6243,6470,6572,6575,6686]
adblock: 6406 [6110,6279,6406,6483,6636]
adblock-plus: 6368 [6288,6296,6368,6495,6536]
turn-of-the-light: 6347 [6246,6319,6347,6469,7171]
evernote-web-clipper: 6205 [6112,6168,6205,6279,6626]
default: 6150 [6049,6109,6150,6430,6494]
```

- https://www.bbc.com/news

```
turn-of-the-light: 10339 [9155,9329,10339,11640,11685]
honey: 10265 [9819,9887,10265,10808,11245]
grammarly: 9585 [9446,9468,9585,10011,10153]
default: 9430 [9118,9272,9430,9830,9852]
evernote-web-clipper: 9422 [9325,9366,9422,9629,10014]
adblock: 8997 [8982,8987,8997,9016,9026]
adblock-plus: 8991 [8856,8967,8991,9040,9137]
```

### Development

- download extension using https://chrome-extension-downloader.com/
- put it into `extensions` folder
- add new property to `extensions.js`
