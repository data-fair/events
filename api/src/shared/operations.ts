// operations.ts — pure functions only
// must not import #mongo, #config, or store state

export const backoffMinutes = (nbErrors: number): number => {
  return Math.ceil(Math.pow(nbErrors, 2.5))
}
