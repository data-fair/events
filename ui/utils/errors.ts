/* eslint-disable @typescript-eslint/no-explicit-any */

export function getErrorMessage (error: string | any) {
  if (typeof error === 'string') return error
  if (error.data && typeof error.data === 'string') return error.data
  return error.message ?? error.statusText ?? JSON.stringify(error)
}

export function throwFatalError (message: string | any, error?: string | any) {
  if (!error) {
    error = message
    message = ''
  }
  console.error(message, error)
  message += getErrorMessage(error)
  throw createError({ message, stack: error.stack, fatal: true })
}
