import dotenv from 'dotenv'
// .env fills the variables the environment does not set already (dotenv never overrides them); the
// production names (MONGO_URL, PRIVATE_DIRECTORY_URL...) override this file (custom-environment-variables.mjs)
dotenv.config({ path: ['.env', '../.env'], quiet: true })

if (!process.env.DEV_API_PORT) throw new Error('missing DEV_API_PORT env variable, run "npm run dev-deps" to create the .env file')

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
