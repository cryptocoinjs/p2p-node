var fs = require('fs')

module.exports={
  TLS_connection_options: {
    key: fs.readFileSync('lib/key.pem'),
    cert: fs.readFileSync('lib/cert.pem')
  }
}