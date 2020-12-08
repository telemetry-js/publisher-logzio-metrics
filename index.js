'use strict'

const reusify = require('reusify')
const ms = require('bruce-millis')
const osc = require('on-stream-close')
const { EventEmitter } = require('events')
const net = require('net')
const TimeBucket = require('./lib/time-bucket')

const kResolution = Symbol('kResolution')
const kCommon = Symbol('kCommon')
const kBackgroundFlushCallback = Symbol('kBackgroundFlushCallback')
const kBackgroundFlushing = Symbol('kBackgroundFlushing')
const kBackgroundFlush = Symbol('kBackgroundFlush')
const kBackgroundFlushed = Symbol('kBackgroundFlushed')
const kReset = Symbol('kReset')
const kBucketPool = Symbol('kBucketPool')
const kBuckets = Symbol('kBuckets')
const kTime = Symbol('kTime')

module.exports = plugin

function plugin (options) {
  return new LogzIOMetricsPublisher(options)
}

class LogzIOMetricsPublisher extends EventEmitter {
  constructor (options) {
    super()

    if (!options) options = {}

    const port = parseInt(options.port || 5050, 10)
    const hostname = options.hostname || 'listener.logz.io'
    const resolution = ms(options.resolution || '1s')
    const token = options.token
    const time = options.time === false ? false : options.time || 'ms'
    const type = options.type || 'custom'

    if (!Number.isInteger(port) || port <= 0) {
      throw new TypeError('The "port" option must be a positive integer')
    } else if (typeof hostname !== 'string' || hostname === '') {
      throw new TypeError('The "hostname" option must be a non-empty string')
    } else if (!Number.isInteger(resolution) || resolution <= 0) {
      throw new TypeError('The "resolution" option must be a positive integer or a string with unit (e.g. "1s")')
    } else if (typeof token !== 'string' || token === '') {
      throw new TypeError('The "token" option is required and must be a string')
    } else if (time !== 'ms' && time !== 'iso' && time !== false) {
      throw new TypeError('The "time" option must be "ms", "iso" or false')
    } else if (typeof type !== 'string') {
      throw new TypeError('The "type" option must be a string')
    }

    this.port = port
    this.hostname = hostname

    this[kResolution] = resolution
    this[kCommon] = `"type":${JSON.stringify(type)},"token":${JSON.stringify(token)}`
    this[kBackgroundFlushCallback] = this[kBackgroundFlushCallback].bind(this)
    this[kBackgroundFlushing] = false
    this[kTime] = time
    this[kReset]()
  }

  [kReset] () {
    this[kBucketPool] = reusify(TimeBucket)
    this[kBuckets] = new Map()
  }

  start (callback) {
    this[kReset]()
    process.nextTick(callback)
  }

  publish (metric) {
    if (metric.date == null) return

    // Group metrics by time, rounding to the nearest multiple of resolution
    const original = metric.date.valueOf()
    const time = Math.floor(original / this[kResolution]) * this[kResolution]

    let bucket = this[kBuckets].get(time)

    if (bucket === undefined) {
      bucket = this[kBucketPool].get()
      this[kBuckets].set(time, bucket)
    }

    bucket.group(metric).add(metric)
  }

  ping (callback) {
    if (this[kBuckets].size === 0) {
      // No need to dezalgo ping()
      return callback()
    }

    // Perform sending in background, to not delay other plugins.
    if (!this[kBackgroundFlushing]) {
      this[kBackgroundFlush]()
    }

    callback()
  }

  stop (callback) {
    if (this[kBackgroundFlushing]) {
      this.once(kBackgroundFlushed, this.stop.bind(this, callback))
    } else {
      this.once(kBackgroundFlushed, callback)
      this[kBackgroundFlush]()
    }
  }

  [kBackgroundFlush] () {
    this[kBackgroundFlushing] = true
    this.flush(this[kBackgroundFlushCallback])
  }

  [kBackgroundFlushCallback] (err) {
    this[kBackgroundFlushing] = false
    if (err) this.emit('error', err)
    this.emit(kBackgroundFlushed)
  }

  // Exposed for standalone usage
  flush (callback) {
    if (callback === undefined) {
      var promise = new Promise((resolve, reject) => {
        callback = function (err, result) {
          if (err) reject(err)
          else resolve(result)
        }
      })
    }

    // Send as logstash (NDJSON over TCP)
    let ndjson = ''

    for (const [time, bucket] of this[kBuckets]) {
      for (const group of bucket.groups) {
        if (group.hasData) {
          if (this[kTime] === 'ms') {
            ndjson += `{${this[kCommon]},"@timestamp":${time},${group.stringify()}}\n`
          } else if (this[kTime] === 'iso') {
            const iso = new Date(time).toISOString()
            ndjson += `{${this[kCommon]},"@timestamp":"${iso}",${group.stringify()}}\n`
          } else {
            ndjson += `{${this[kCommon]},${group.stringify()}}\n`
          }
        }

        group.reset()
      }

      this[kBucketPool].release(bucket)
    }

    this[kBuckets].clear()

    if (ndjson !== '') {
      const socket = net.connect(this.port, this.hostname)

      // Sending metrics is best-effort. There's no
      // retry, to avoid a pile-up of queued metrics.
      osc(socket, callback)

      socket.setTimeout(30e3, onTimeout)
      socket.end(ndjson)

      // console.error(ndjson.replace(/"token":"[^"]+",/, '"token":"***",'))
    } else {
      process.nextTick(callback)
    }

    return promise
  }
}

function onTimeout () {
  this.destroy(new Error('Connection to Logz.io timed out'))
}
