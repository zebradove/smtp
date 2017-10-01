const http2 = require('http2')

exports.register = function () {
  this.inherits('auth/auth_base')
  this.load_zebradove_api_ini()
}

exports.load_zebradove_api_ini = function () {
  this.cfg = this.config.get('zebradove_alias.ini', () => {
    this.load_zebradove_api_ini()
  })
}

exports.hook_capabilities = async function (next, connection) {
  if (!connection.remote.is_private && !connection.tls.enabled) {
    connection.logdebug(this, 'Auth disabled for insecure public connection')
    return next()
  }
  const methods = ['LOGIN', 'PLAIN']
  connection.capabilities.push(`AUTH ${methods.join(' ')}`)
  connection.notes.allowed_auth_methods = methods
  return next()
}

exports.check_plain_passwd = async function (connection, username, password, next) {
  const req = http2.request({
    hostname: this.cfg.main.hostname,
    port: parseInt(this.cfg.main.port),
    path: '/authenticate',
    method: 'POST',
    auth: `smtp:${this.cfg.main.secret}`,
    rejectUnauthorized: false
  })
  let data = ''
  req.on('response', res => {
    res.on('data', chunk => { data += chunk.toString('utf8') })
    res.on('end', () => {
      connection.logdebug(this, data)
      const response = JSON.parse(data)
      if (response && response.valid) {
        return next(true)
      }
      return next(false)
    })
  })
  req.end(JSON.stringify({username, password}))
}
