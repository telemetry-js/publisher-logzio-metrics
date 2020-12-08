'use strict'

const metrics = Symbol('metrics')
const dimensionJSON = Symbol('dimensionJSON')
const add = Symbol('add')

module.exports = class DimensionGroup {
  constructor (json) {
    this[metrics] = {}
    this[dimensionJSON] = json
    this.hasData = false
  }

  add (metric) {
    if (metric.isSummary()) {
      const { name, stats, statistic } = metric

      // Our default statistic is "average"
      if (statistic === 'average' || !statistic) {
        // Explode summary into separate logzio metrics
        this[add](name + '.avg', stats.sum / stats.count)
        this[add](name + '.min', stats.min)
        this[add](name + '.max', stats.max)

        // Skipped for now, to spare logzio unique metrics
        // this[add](name + '.sum', stats.sum)
        // this[add](name + '.count', stats.count)
      } else if (statistic === 'sum') {
        this[add](name, stats.sum)
      } else if (statistic === 'count') {
        this[add](name, stats.count)
      } else if (statistic === 'min') {
        this[add](name, stats.min)
      } else if (statistic === 'max') {
        this[add](name, stats.max)
      }
    } else if (metric.isSingle()) {
      this[add](metric.name, metric.value)
    }
  }

  stringify () {
    // TODO (optim): use `fast-json-stringify`
    const m = JSON.stringify(this[metrics])
    return `"metrics":${m},"dimensions":${this[dimensionJSON]}`
  }

  [add] (name, value) {
    if (Number.isFinite(value)) {
      this[metrics][name] = value
      this.hasData = true
    } else {
      this[metrics][name] = undefined
    }
  }

  reset () {
    this.hasData = false

    // We can reuse this object, because the set of metrics doesn't change
    // over the lifetime of the publisher.
    for (const k in this[metrics]) {
      this[metrics][k] = undefined
    }
  }
}
