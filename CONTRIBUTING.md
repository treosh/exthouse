# How to Contribute

First of all, thank you for your interest in `exthouse`.
We'd love to accept your patches and contributions!

#### 1. Clone and install dependencies

```bash
git clone git@github.com:treosh/exthouse.git
npm install
```

#### 2. Development and testing

```bash
# use cli to test extension
./bin/cli.js Grammarly-for-Chrome.crx

# avoid double data collection
./bin/cli.js Grammarly-for-Chrome.crx --disableGather

# test multiple extensions
./bin/cli.js *.crx

# refer predefined extensions with multiple runs
./bin/cli.js extensions/chrome/Honey_v10.8.1.crx --runs=5

# use ./exthouse folder to get all colected data
ll exthouse
```

#### 3. Extensions preset

```bash
ls extensions/chrome/

AdBlock_v3.34.0.crx
Ghostery-–-Privacy-Ad-Blocker_v8.2.5.crx
Honey_v10.8.1.crx
Evernote-Web-Clipper_v7.8.0.crx
Grammarly-for-Chrome_v14.883.1937.crx
LastPass_-Free-Password-Manager_v4.19.0.crx
```
