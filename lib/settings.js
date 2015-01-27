var fs = require('fs')

module.exports={
  useTLS:false,
  TLS_connection_options: {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    rejectUnauthorized: false
  }
}