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
  defaultPushNotif: {
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
    notificationIcon: 'THEME_NOTIFICATION_ICON',
    notificationBadge: 'THEME_NOTIFICATION_BADGE'
  },
  i18n: {
    locales: 'I18N_LOCALES',
    defaultLocale: 'I18N_DEFAULT_LOCALE'
  }
}
