module.exports = {
  mongoUrl: 'MONGO_URL',
  port: 'PORT',
  privateDirectoryUrl: 'PRIVATE_DIRECTORY_URL',
  secretKeys: {
    identities: 'SECRET_IDENTITIES',
    events: 'SECRET_EVENTS',
    sendMails: 'SECRET_SENDMAILS'
  },
  gcmAPIKey: 'GCM_API_KEY',
  apn: {
    token: {
      key: 'APN_TOKEN_KEY',
      keyId: 'APN_TOKEN_KEY_ID',
      teamId: 'APN_TOKEN_TEAM_ID'
    },
    production: 'APN_PRODUCTION'
  },
  defaultPushNotif: {
    apn: {
      __name: 'DEFAULT_PUSH_NOTIF_APN',
      __format: 'json'
    },
    webpush: {
      __name: 'DEFAULT_PUSH_NOTIF_WEBPUSH',
      __format: 'json'
    }
  },
  observer: {
    active: 'OBSERVER_ACTIVE',
    port: 'OBSERVER_PORT'
  },
  theme: {
    logo: 'THEME_LOGO',
    notificationIcon: 'THEME_NOTIFICATION_ICON',
    notificationBadge: 'THEME_NOTIFICATION_BADGE'
  },
  i18n: {
    locales: 'I18N_LOCALES',
    defaultLocale: 'I18N_DEFAULT_LOCALE'
  }
}
