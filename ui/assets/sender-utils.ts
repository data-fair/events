import type { Event } from '#shared/types/index.js'

export const parseSender = (senderStr: string) => {
  if (senderStr === 'none') return senderStr

  const senderParts = senderStr.split(':')

  const sender: Event['sender'] = {
    type: senderParts[0] as 'organization' | 'user',
    id: senderParts[1]
  }
  if (senderParts[2]) sender.department = senderParts[2]
  if (senderParts[3]) sender.role = senderParts[3]
  return sender
}

export const serializeSender = (sender: Event['sender'], includeRole = false) => {
  let str = `${sender.type}:${sender.id}:${sender.department || ''}`
  if (includeRole && sender.role) str += `:${sender.role}`
  return str
}