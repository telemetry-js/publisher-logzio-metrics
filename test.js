'use strict'

const test = require('tape')
const single = require('@telemetry-js/metric').single
const net = require('net')
const plugin = require('.')
const token = 'test'

for (const tags of [{}, { foo: 23 }]) {
  test('publish metric with tags: ' + JSON.stringify(tags), wrap(function (t, opts, done) {
    const publisher = plugin({ token, ...opts })
    const metric = single('telemetry.test.count', { unit: 'count', value: 1, tags })
    const date = new Date()
    const time = Math.floor(date.valueOf() / 1e3) * 1e3

    metric.touch(date)
    publisher.publish(metric)
    publisher.flush((err) => {
      done(err, [JSON.stringify({
        type: 'custom',
        token: 'test',
        '@timestamp': time,
        metrics: {
          'telemetry.test.count': 1
        },
        dimensions: tags
      }) + '\n'])
    })
  }))
}

test('publish 2 metrics with the same name, time and tags', wrap(function (t, opts, done) {
  const publisher = plugin({ token, ...opts })
  const metric1 = single('telemetry.test1.count', { unit: 'count', value: 1 })
  const metric2 = single('telemetry.test1.count', { unit: 'count', value: 2 })
  const date = new Date()
  const time = Math.floor(date.valueOf() / 1e3) * 1e3

  for (const m of [metric1, metric2]) {
    m.touch(date)
    publisher.publish(m)
  }

  publisher.flush((err) => {
    done(err, [JSON.stringify({
      type: 'custom',
      token: 'test',
      '@timestamp': time,
      metrics: {
        'telemetry.test1.count': 2
      },
      dimensions: {}
    }) + '\n'])
  })
}))

test('publish 2 metrics with the same name, tags and nearly the same time', wrap(function (t, opts, done) {
  const publisher = plugin({ token, ...opts, resolution: '1m' })
  const metric1 = single('telemetry.test1.count', { unit: 'count', value: 1 })
  const metric2 = single('telemetry.test1.count', { unit: 'count', value: 2 })
  const date1 = new Date()
  const date2 = new Date(date1 + 1e3)
  const time2 = Math.floor(date2.valueOf() / 60e3) * 60e3

  metric1.touch(date1)
  metric2.touch(date2)

  for (const m of [metric1, metric2]) {
    publisher.publish(m)
  }

  publisher.flush((err) => {
    done(err, [JSON.stringify({
      type: 'custom',
      token: 'test',
      '@timestamp': time2,
      metrics: {
        'telemetry.test1.count': 2
      },
      dimensions: {}
    }) + '\n'])
  })
}))

test('publish 2 metrics with the same time and tags', wrap(function (t, opts, done) {
  const publisher = plugin({ token, ...opts })
  const metric1 = single('telemetry.test1.count', { unit: 'count', value: 1 })
  const metric2 = single('telemetry.test2.count', { unit: 'count', value: 2 })
  const date = new Date()
  const time = Math.floor(date.valueOf() / 1e3) * 1e3

  for (const m of [metric1, metric2]) {
    m.touch(date)
    publisher.publish(m)
  }

  publisher.flush((err) => {
    done(err, [JSON.stringify({
      type: 'custom',
      token: 'test',
      '@timestamp': time,
      metrics: {
        'telemetry.test1.count': 1,
        'telemetry.test2.count': 2
      },
      dimensions: {}
    }) + '\n'])
  })
}))

test('publish 2 metrics with the same tags', wrap(function (t, opts, done) {
  const publisher = plugin({ token, ...opts })
  const metric1 = single('telemetry.test1.count', { unit: 'count', value: 1 })
  const metric2 = single('telemetry.test2.count', { unit: 'count', value: 2 })
  const date1 = new Date(5e3)
  const date2 = new Date(10e3)
  const time1 = Math.floor(date1.valueOf() / 1e3) * 1e3
  const time2 = Math.floor(date2.valueOf() / 1e3) * 1e3

  metric1.touch(date1)
  metric2.touch(date2)

  for (const m of [metric1, metric2]) {
    publisher.publish(m)
  }

  publisher.flush((err) => {
    done(err, [JSON.stringify({
      type: 'custom',
      token: 'test',
      '@timestamp': time1,
      metrics: {
        'telemetry.test1.count': 1
      },
      dimensions: {}
    }) + '\n' + JSON.stringify({
      type: 'custom',
      token: 'test',
      '@timestamp': time2,
      metrics: {
        'telemetry.test2.count': 2
      },
      dimensions: {}
    }) + '\n'])
  })
}))

test('publish 2 metrics with the same tags, repeat 1', wrap(function (t, opts, done) {
  const publisher = plugin({ token, ...opts })
  const metric1 = single('telemetry.test1.count', { unit: 'count', value: 1 })
  const metric2 = single('telemetry.test2.count', { unit: 'count', value: 2 })
  const metric3 = single('telemetry.test2.count', { unit: 'count', value: 3 })
  const date1 = new Date(5e3)
  const date2 = new Date(10e3)
  const date3 = new Date(15e3)
  const time1 = Math.floor(date1.valueOf() / 1e3) * 1e3
  const time2 = Math.floor(date2.valueOf() / 1e3) * 1e3
  const time3 = Math.floor(date3.valueOf() / 1e3) * 1e3

  metric1.touch(date1)
  metric2.touch(date2)
  metric3.touch(date3)

  for (const m of [metric1, metric2]) {
    publisher.publish(m)
  }

  publisher.flush((err) => {
    t.ifError(err)
    publisher.publish(metric3)
    publisher.flush((err) => {
      done(err, [JSON.stringify({
        type: 'custom',
        token: 'test',
        '@timestamp': time1,
        metrics: {
          'telemetry.test1.count': 1
        },
        dimensions: {}
      }) + '\n' + JSON.stringify({
        type: 'custom',
        token: 'test',
        '@timestamp': time2,
        metrics: {
          'telemetry.test2.count': 2
        },
        dimensions: {}
      }) + '\n', JSON.stringify({
        type: 'custom',
        token: 'test',
        '@timestamp': time3,
        metrics: {
          'telemetry.test2.count': 3
        },
        dimensions: {}
      }) + '\n'])
    })
  })
}, 2))

test('publish 2 metrics with the same time', wrap(function (t, opts, done) {
  const publisher = plugin({ token, ...opts })
  const metric1 = single('telemetry.test1.count', { unit: 'count', value: 1 })
  const metric2 = single('telemetry.test2.count', { unit: 'count', value: 2, tags: { x: '2' } })
  const date = new Date()
  const time = Math.floor(date.valueOf() / 1e3) * 1e3

  for (const m of [metric1, metric2]) {
    m.touch(date)
    publisher.publish(m)
  }

  publisher.flush((err) => {
    done(err, [JSON.stringify({
      type: 'custom',
      token: 'test',
      '@timestamp': time,
      metrics: {
        'telemetry.test1.count': 1
      },
      dimensions: {}
    }) + '\n' + JSON.stringify({
      type: 'custom',
      token: 'test',
      '@timestamp': time,
      metrics: {
        'telemetry.test2.count': 2
      },
      dimensions: { x: '2' }
    }) + '\n'])
  })
}))

process.env.LOGZIO_METRICS_TOKEN && test('send to real logz.io', function (t) {
  const token = process.env.LOGZIO_METRICS_TOKEN
  const publisher = plugin({ token })
  const tags = { environment: 'test' }
  const metric1 = single('telemetry.test1.count', { unit: 'count', value: 207, tags })
  const metric2 = single('telemetry.test2.count', { unit: 'count', value: 208, tags })
  const metric3 = single('telemetry.test3.count', { unit: 'count', value: 209, tags })

  publisher.publish(metric1)
  publisher.publish(metric2)
  publisher.publish(metric3)

  publisher.flush((err) => {
    t.ifError(err)
    t.end()
  })
})

function wrap (fn, expectedRequests) {
  return function (t) {
    let pending = 1 + (expectedRequests || 1)
    let expected
    const actual = []

    const hostname = '127.0.0.1'
    const server = net.createServer(function (conn) {
      let data = ''

      conn.on('data', function (chunk) {
        // console.error('data', String(chunk))
        data += chunk
      })

      conn.on('end', function () {
        actual.push(data)
        finish()
      })
    })

    server.listen(0, hostname, function () {
      const port = this.address().port
      t.pass(`listening on ${hostname}:${port}`)

      fn(t, { port, hostname }, function done (err, expectedData) {
        t.ifError(err, 'no error')
        expected = expectedData
        finish()
      })
    })

    function finish () {
      if (--pending === 0) {
        t.same(actual, expected)
        server.close(t.end.bind(t))
      }
    }
  }
}
