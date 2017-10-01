const http2 = require('../lib/http2')

exports.register = function () {
  this.inherits('auth/auth_base')
  this.load_zebradove_api_ini()
}

exports.load_zebradove_api_ini = function () {
  this.cfg = this.config.get('zebradove_alias.ini', () => {
    this.load_zebradove_api_ini()
  })
}

exports.hook_rcpt = async function (next, connection, params) {
  const rcpt = params[0]
  const mfrom = connection.transaction.mail_from
  try {
    const response = await http2.request({
      hostname: this.cfg.main.hostname,
      port: parseInt(this.cfg.main.port),
      path: `/aliases/resolve`,
      method: 'POST',
      auth: `smtp:${this.cfg.main.secret}`,
      rejectUnauthorized: false
    }, {name: rcpt.address(), from: mfrom.address()})
    const body = response.body
    if (!body.valid) return next('DENY', 'User does not exist')
    connection.logdebug(this, body)
    rcpt.user = body.user
    rcpt.host = body.host
    connection.loginfo(this, `Resolved to ${rcpt}`)
    next()
  } catch (ex) {
    connection.logerror(this, ex)
    next('DENY', 'Internal error')
  }
}
