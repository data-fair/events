// the account a line is about, as in data-fair and simple-directory: accountKey in the log context
// stays the actor's. The 3 keys are always present: pino drops the undefined ones from the line
export const ownerLogFields = (owner: { type: string, id: string, name?: string, department?: string }) => ({
  ownerKey: owner.type + '.' + owner.id,
  ownerDep: owner.department || undefined,
  ownerName: owner.name || undefined
})

// a webhook url can hold a token of the target: only its host is logged
export const urlHost = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return undefined
  }
}
