const http2 = require('../lib/http2')
const Address = require('address-rfc2821')

exports.register = function () {
  this.load_zebradove_api_ini()
}

exports.load_zebradove_api_ini = function () {
  this.cfg = this.config.get('zebradove_alias.ini', () => {
    this.load_zebradove_api_ini()
  })
}

exports.hook_data = function (next, connection) {
  connection.transaction.parse_body = true
  next()
}

exports.hook_queue_outbound = async function (next, connection, params) {
  const rcpt = connection.transaction.rcpt_to[0]
  const mfrom = connection.transaction.mail_from.address()
  connection.loginfo(this, `Outbound to ${rcpt.address()}`)
  try {
    const response = await http2.request({
      hostname: this.cfg.main.hostname,
      port: parseInt(this.cfg.main.port),
      path: `/aliases/for/${rcpt.address()}`,
      method: 'GET',
      auth: `smtp:${this.cfg.main.secret}`,
      rejectUnauthorized: false
    })
    if (response.body.name) {
      connection.transaction.mail_from = new Address.Address(`<${response.body.name}>`)
      connection.transaction.remove_header('From')
      connection.transaction.add_header('From', `<${response.body.name}>`)

      const received = connection.transaction.header.get('Received')
      connection.transaction.remove_header('Received')
      connection.transaction.add_header('Received', received.replace(mfrom, response.body.name))

      connection.loginfo(this, `Aliased from ${connection.transaction.mail_from}`)
      return next('CONT')
    }
    return next(DENYSOFT, 'Internal error')
  } catch (ex) {
    connection.logerror(this, JSON.stringify(ex))
    next(DENYSOFT, 'Internal server error')
  }
}
