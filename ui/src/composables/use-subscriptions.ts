import type { Subscription } from '#api/types'

// current user subscriptions indexed by topic key
const topicsSubscriptions = reactive<Record<string, Subscription>>({})

export default () => ({
  topicsSubscriptions
})
