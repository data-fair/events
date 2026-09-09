import Bowser from 'bowser'

// a short human readable label for a device, used as a default registration name and in ui logs
export const describeUserAgent = (userAgent: string | undefined) => {
  if (!userAgent) return 'Other'
  const { browser, os } = Bowser.parse(userAgent)
  const browserLabel = [browser.name, browser.version].filter(Boolean).join(' ')
  const osLabel = [os.name, os.versionName ?? os.version].filter(Boolean).join(' ')
  return [browserLabel, osLabel].filter(Boolean).join(' / ') || 'Other'
}
