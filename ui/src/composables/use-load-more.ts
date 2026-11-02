import type { Ref } from 'vue'

type Page<T> = { results: T[], count: number }

// a list with a "Voir plus": the first page, then the next ones appended
export const useLoadMore = <T extends { _id?: string }, R extends Page<T> = Page<T>>(path: string, query: () => Record<string, unknown>, size = 20) => {
  const items = ref() as Ref<T[] | undefined>
  const count = ref(0)
  // the whole first response, for what a page reads from it (the new notifications)
  const first = ref() as Ref<R | undefined>

  const refresh = useAsyncAction(async () => {
    const res = await $fetch<R>(path, { query: { ...query(), size } })
    first.value = res
    items.value = res.results
    count.value = res.count
  })

  const more = useAsyncAction(async () => {
    if (!items.value) return
    const res = await $fetch<R>(path, { query: { ...query(), size, skip: items.value.length } })
    // the items added or removed live shifted the pages: skip the ones already listed
    const known = new Set(items.value.map(item => item._id))
    items.value = items.value.concat(res.results.filter(item => !known.has(item._id)))
  })

  refresh.execute()
  return { items, count, first, refresh, more }
}
