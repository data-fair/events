module.exports = {
  privateDirectoryUrl: 'http://simple-directory:8080',
  mongoUrl: 'mongodb://localhost:27017/data-fair-events',
  origin: null,
  port: 8080,
  observer: {
    active: true,
    port: 9090
  },
  // secrets that can be used to configure global webhooks for example to update users and organizations
  secretKeys: {
    identities: null,
    events: null,
    sendMails: null
  },
  gcmAPIKey: null,
  apn: {
    token: {
      key: null,
      keyId: null,
      teamId: null
    },
    production: false
  },
  defaultPushNotif: {
    apn: {},
    webpush: {}
  },
  worker: {
    loopInterval: 4000
  },
  theme: {
    logo: null,
    notificationIcon: null,
    notificationBadge: null
  },
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr'
  }
}
