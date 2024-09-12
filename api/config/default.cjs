module.exports = {
  privateDirectoryUrl: 'http://simple-directory:8080',
  mongoUrl: 'mongodb://localhost:27017/data-fair-events',
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
  gcmAPIKey: undefined,
  apn: {
    token: {
      key: undefined,
      keyId: undefined,
      teamId: undefined
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
  },
  securityDir: '../security'
}
