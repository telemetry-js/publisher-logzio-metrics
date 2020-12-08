'use strict'

const stringify = require('json-stable-stringify')
const DimensionGroup = require('./dimension-group')
const nameIndex = Symbol('nameIndex')
const jsonIndex = Symbol('jsonIndex')

module.exports = class TimeBucket {
  constructor () {
    this[nameIndex] = new Map()
    this[jsonIndex] = new Map()
    this.groups = []
  }

  group (metric) {
    // Group metrics by distinct sets of tags
    let group = this[nameIndex].get(metric.name)

    if (group === undefined) {
      // We only have to do this once per named metric.
      const json = stringify(metric.tags)
      group = this[jsonIndex].get(json)

      if (group === undefined) {
        // We only have to do this once per distinct tag set.
        group = new DimensionGroup(json)

        this[jsonIndex].set(json, group)
        this.groups.push(group)
      }

      this[nameIndex].set(metric.name, group)
    }

    return group
  }
}
