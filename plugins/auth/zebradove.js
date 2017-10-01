const http2 = require('../../lib/http2')

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
  try {
    const response = await http2.request({
      hostname: this.cfg.main.hostname,
      port: parseInt(this.cfg.main.port),
      path: '/authenticate',
      method: 'POST',
      auth: `smtp:${this.cfg.main.secret}`,
      rejectUnauthorized: false
    }, {username, password})
    next(response.body.valid)
  } catch (ex) {
    next(false)
  }
}
