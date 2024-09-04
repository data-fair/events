module.exports = {
  origin: 'http://localhost:5600',
  port: 8082,
  privateDirectoryUrl: 'http://localhost:8080',
  mongoUrl: 'mongodb://localhost:27017/data-fair-events-test',
  observer: {
    port: 9092,
    active: false
  },
  secretKeys: {
    identities: 'SECRET_IDENTITIES',
    events: 'SECRET_EVENTS',
    sendMails: 'SECRET_SENDMAILS'
  },
  securityDir: './security'
}
