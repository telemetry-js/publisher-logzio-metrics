# publisher-logzio-metrics

> **Publish metrics to [Logz.io Metrics](https://docs.logz.io/user-guide/infrastructure-monitoring/custom-metrics).**  
> A [`telemetry`](https://github.com/telemetry-js/telemetry) plugin.

[![npm status](http://img.shields.io/npm/v/@telemetry-js/publisher-logzio-metrics.svg)](https://www.npmjs.org/package/@telemetry-js/publisher-logzio-metrics)
[![node](https://img.shields.io/node/v/@telemetry-js/publisher-logzio-metrics.svg)](https://www.npmjs.org/package/@telemetry-js/publisher-logzio-metrics)
[![Test](https://github.com/telemetry-js/publisher-logzio-metrics/workflows/Test/badge.svg?branch=main)](https://github.com/telemetry-js/publisher-logzio-metrics/actions)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Table of Contents

<details><summary>Click to expand</summary>

- [Usage](#usage)
- [Format](#format)
- [Options](#options)
  - [`token`](#token)
  - [`resolution`](#resolution)
  - [`time`](#time)
  - [`type`](#type)
  - [`hostname`](#hostname)
  - [`port`](#port)
- [Install](#install)
- [Acknowledgements](#acknowledgements)
- [License](#license)

</details>

## Usage

```js
const telemetry = require('@telemetry-js/telemetry')()
const logzio = require('@telemetry-js/publisher-logzio-metrics')

telemetry.task()
  .collect(..)
  .schedule(..)
  .publish(logzio, { token: '***' })
```

## Format

Metrics are grouped by time and tags (known as _dimensions_ in Logz.io) into what Logz.io calls a _document_. Which looks like this:

```json
{
  "type": "custom",
  "token": "***",
  "@timestamp": 1599221440000,
  "metrics": {
    "telemetry.beep.count": 26,
    "telemetry.boop.count": 81,
  },
  "dimensions": {
    "environment": "test"
  }
}
```

Documents are then sent to Logz.io as NDJSON over TCP. This traffic is not encrypted.

## Options

### `token`

String, required. Secret token of Logz.io metrics account. Note that metrics accounts and their tokens are separate from log accounts.

### `resolution`

Expected millisecond interval between repeated metrics. A number or string to be parsed by [`bruce-millis`](https://github.com/vweevers/bruce-millis), default is 1 second. Metrics are grouped by their time, rounded to the nearest multiple of `resolution`.

If the resolution is too small then no grouping will occur, leading to inefficient documents. If the resolution is too large (i.e. more than your [schedule interval](https://github.com/telemetry-js/schedule-simple) or [summarize window](https://github.com/telemetry-js/processor-summarize)) then metrics - that have the same name and dimensions within that time window - will be overwritten, only sending the last value to Logz.io.

### `time`

Format of the `@timestamp` field. The right choice depends on how your Logz.io account is configured to parse timestamps. Can be one of:

- `'ms'`: unix timestamp in milliseconds (default)
- `'iso'`: [simplified extended ISO](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- `false`: don't add a `@timestamp` field, in which case metrics take the time at which they're received by Logz.io. If you're unsure which format to use, start with `false` and inspect raw logs in Logz.io to see which format Logz.io itself adds. Be aware that Logz.io silently drops documents that have an unexpected format.

### `type`

String, default `'custom'`. Log type for Logz.io to know how to parse documents.

### `hostname`

String, default `'listener.logz.io'`.

### `port`

Number, default `5050`.

## Install

With [npm](https://npmjs.org) do:

```
npm install @telemetry-js/publisher-logzio-metrics
```

## Acknowledgements

This project is kindly sponsored by [Reason Cybersecurity Ltd](https://reasonsecurity.com).

[![reason logo](https://cdn.reasonsecurity.com/github-assets/reason_signature_logo.png)](https://reasonsecurity.com)

## License

[MIT](LICENSE) © Vincent Weevers
