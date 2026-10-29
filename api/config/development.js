import dotenv from 'dotenv'
dotenv.config({ path: import.meta.resolve('../../.env').replace('file://', '') })

if (!process.env.DEV_API_PORT) throw new Error('missing DEV_API_PORT env variable, run "npx --no df-dev setup"')

export default {
  port: process.env.DEV_API_PORT,
  privateDirectoryUrl: `http://localhost:${process.env.SD_PORT}`,
  mongoUrl: `mongodb://localhost:${process.env.MONGO_PORT}/data-fair-events-development`,
  observer: {
    active: false,
    port: 9092
  },
  secretKeys: {
    identities: 'secret-identities',
    events: 'secret-events',
    sendMails: 'secret-sendmails'
  }
}
