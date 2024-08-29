module.exports = {
  mongoUrl: 'MONGO_URL',
  origin: 'ORIGIN',
  port: 'PORT',
  privateDirectoryUrl: 'PRIVATE_DIRECTORY_URL',
  secretKeys: {
    identities: 'SECRET_IDENTITIES',
    notifications: 'SECRET_NOTIFICATIONS',
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
  }
}
