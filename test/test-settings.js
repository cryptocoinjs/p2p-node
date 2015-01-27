var fs = require('fs')

module.exports={
  useTLS:false,
  TLS_server_options: {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    rejectUnauthorized:false,
    requestCert:true
  }
}