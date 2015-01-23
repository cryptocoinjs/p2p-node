var fs = require('fs')

module.exports={
  TLS_server_options: {
    key: fs.readFileSync('lib/key.pem'),
    cert: fs.readFileSync('lib/cert.pem'),
    rejectUnauthorized:false,
    requestCert:true
  },
  TLS_connection_options: {
    key: fs.readFileSync('lib/key.pem'),
    cert: fs.readFileSync('lib/cert.pem'),
    rejectUnauthorized:false
  }
}