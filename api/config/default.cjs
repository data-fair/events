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
    identities: undefined,
    events: undefined,
    sendMails: undefined
  },
  gcmAPIKey: undefined,
  defaultPushNotif: {
    webpush: {}
  },
  worker: {
    loopInterval: 4000
  },
  theme: {
    // notificationIcon: '',
    // notificationBadge: ''
  },
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr'
  }
}
