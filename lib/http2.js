const http2 = require('http2')

exports.request = function (options, body) {
  return new Promise((resolve, reject) => {
    const req = http2.request(options)
    let data = ''
    req.on('response', res => {
      res.on('data', chunk => { data += chunk.toString('utf8') })
      res.on('end', () => {
        const response = JSON.parse(data)
        if (response) {
          return resolve({res, body: response})
        }
        return reject(new Error('Could not parse request response'))
      })
    })
    req.on('error', reject)
    if (body) {
      req.end(JSON.stringify(body))
    } else {
      req.end()
    }
  })
}
